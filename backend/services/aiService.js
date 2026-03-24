import https from "https";
import crypto from "crypto";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("aiService");

// ─── Multiple Gemini API Keys (rotation) ────────────────────────────────────
// Set GEMINI_API_KEYS as a comma-separated list in .env for rotation.
// Falls back to single GEMINI_API_KEY if GEMINI_API_KEYS is not set.
function getGeminiKey() {
  const keyList = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  if (keyList.length > 0) {
    const picked = keyList[Math.floor(Math.random() * keyList.length)];
    logger.debug(`Using Gemini key pool (${keyList.length} keys available)`);
    return picked;
  }

  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  throw new Error("No Gemini API key configured. Set GEMINI_API_KEY or GEMINI_API_KEYS in .env");
}

// ─── Hashing ─────────────────────────────────────────────────────────────────
function hashTranscript(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ─── Cache: Read ─────────────────────────────────────────────────────────────
async function getCache(transcriptHash) {
  try {
    const { rows } = await pool.query(
      "SELECT tasks FROM ai_cache WHERE transcript_hash = $1 LIMIT 1",
      [transcriptHash]
    );
    return rows.length > 0 ? rows[0].tasks : null;
  } catch (err) {
    logger.warn("Cache lookup failed (non-fatal):", err.message);
    return null;
  }
}

// ─── Cache: Write ────────────────────────────────────────────────────────────
async function saveCache(transcriptHash, transcript, tasks) {
  try {
    await pool.query(
      `INSERT INTO ai_cache (transcript_hash, transcript, tasks)
       VALUES ($1, $2, $3)
       ON CONFLICT (transcript_hash) DO NOTHING`,
      [transcriptHash, transcript, JSON.stringify(tasks)]
    );
    logger.info("Cached Gemini response for future reuse");
  } catch (err) {
    logger.warn("Cache save failed (non-fatal):", err.message);
  }
}

// ─── Fallback Task ───────────────────────────────────────────────────────────
function generateFallback(transcript) {
  logger.warn("Returning fallback task due to Gemini failure");
  return [
    {
      title: "Follow up on meeting",
      description: transcript.substring(0, 100),
      status: "pending",
      assigned_to: "unknown",
      priority: "Medium",
    },
  ];
}

// ─── Safe parse + cleanup of Gemini response ────────────────────────────────
function parseAndCleanTasks(rawText) {
  logger.info("Raw Gemini response:", rawText);

  // Strip markdown fences if present
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  // Ensure always an array
  const tasks = Array.isArray(parsed) ? parsed : [parsed];

  // Clean each task: enforce defaults, drop empty ones
  const cleanedTasks = tasks
    .filter((t) => t && t.title && t.title.trim() !== "")
    .map((t) => ({
      title: t.title.trim(),
      description: (t.description || "").trim(),
      assigned_to: (t.assigned_to || "unknown").trim(),
      due_date: t.due_date || null,
      status: "pending",
    }));

  logger.info("Parsed tasks array:", JSON.stringify(cleanedTasks, null, 2));

  return cleanedTasks;
}

// ─── Gemini API Call (with improved prompt) ──────────────────────────────────
async function callGemini(text) {
  const apiKey = getGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

  const prompt = `You are a task extraction assistant. Your job is to extract EVERY task from a meeting transcript.

RULES:
- Extract ALL tasks — if 5 tasks exist, return 5 objects. NEVER merge multiple tasks into one.
- Split combined sentences. "Aditya will do laundry and Ravi will cook" = 2 separate tasks.
- If a person's name is mentioned with a task, that person is "assigned_to". NEVER return "unknown" when a name is present.
  Example: "Aditya will do laundry" → assigned_to: "Aditya"
  Example: "Sarah needs to review the PR" → assigned_to: "Sarah"
- If no name is mentioned for a task, set assigned_to to "unknown".
- "title" should be short and actionable (e.g. "Review database schema").
- "description" should add brief context from the transcript.
- "due_date" should be "YYYY-MM-DD" ONLY if a date is explicitly mentioned, otherwise null.
- "status" must always be "pending".

OUTPUT FORMAT — return ONLY a raw JSON array, no markdown, no explanation:
[
  {
    "title": "Short task title",
    "description": "Brief context about the task",
    "assigned_to": "Person Name",
    "due_date": null,
    "status": "pending"
  }
]

TRANSCRIPT:
"""
${text}
"""`;

  logger.info("Calling Gemini API...");
  const result = await model.generateContent(prompt);
  if (!result?.response) throw new Error("No response from Gemini API");

  const responseText = result.response.text();
  return parseAndCleanTasks(responseText);
}

// ─── Compress audio buffer before upload ───────────────────────────────────────
// Deepgram's server-side upload timeout is ~10 seconds regardless of client config.
// At typical home broadband speeds, a 700KB+ file exceeds that limit.
// Fix: downsample to 16kHz mono MP3 at 32kbps — reduces ~720KB to ~30KB,
// keeping upload time under 2 seconds and well within Deepgram's window.
function compressAudio(inputBuffer) {
  return new Promise((resolve, reject) => {
    const inputStream = Readable.from(inputBuffer);
    const chunks = [];
    const passthrough = new PassThrough();
    passthrough.on("data", (chunk) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);

    ffmpeg(inputStream)
      .audioFrequency(16000)   // 16kHz — speech-optimised, Deepgram handles perfectly
      .audioChannels(1)         // mono
      .audioBitrate("32k")      // 32kbps MP3 — ~30KB per minute of audio
      .format("mp3")
      .on("error", (err) => {
        logger.error("ffmpeg compression error:", err.message);
        reject(err);
      })
      .pipe(passthrough, { end: true });
  });
}

// ─── Deepgram: Speech → Text ───────────────────────────────────────────────────
export async function speechToText(inputBuffer, mimeType) {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY is missing from environment variables");
  }

  // Compress first — this is what fixes SLOW_UPLOAD
  logger.info(`Original size: ${inputBuffer.length} bytes. Compressing with ffmpeg...`);
  let audioBuffer;
  try {
    audioBuffer = await compressAudio(inputBuffer);
    logger.info(`Compressed to: ${audioBuffer.length} bytes (${Math.round(audioBuffer.length / inputBuffer.length * 100)}% of original)`);
  } catch (err) {
    // If compression fails, fall back to original — it may still work
    logger.warn("ffmpeg compression failed, using original buffer:", err.message);
    audioBuffer = inputBuffer;
  }

  logger.info(`Sending ${audioBuffer.length} bytes to Deepgram...`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.deepgram.com",
      path: "/v1/listen?model=nova-2&smart_format=true",
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length, // always set — prevents chunked encoding
      },
      timeout: 120_000, // 2-min socket-inactivity guard
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");

        if (res.statusCode !== 200) {
          logger.error(`Deepgram HTTP ${res.statusCode}:`, body);
          return reject(new Error(`Deepgram error ${res.statusCode}: ${body}`));
        }

        let data;
        try {
          data = JSON.parse(body);
        } catch {
          return reject(new Error("Deepgram returned non-JSON response"));
        }

        const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (transcript === undefined || transcript === null) {
          logger.error("Deepgram empty response:", JSON.stringify(data, null, 2));
          return reject(new Error("Deepgram returned no transcription results."));
        }

        logger.info(`Transcription complete: ${transcript.length} chars`);
        resolve(transcript);
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Deepgram request timed out. The audio may be too long."));
    });

    req.on("error", (err) => {
      logger.error("Deepgram request error:", err.message);
      reject(err);
    });

    req.write(audioBuffer);
    req.end();
  });
}

// ─── Gemini: Text → Task Extraction (with cache, fallback, smart validation) ─
export async function extractTaskDetails(text) {
  // ── Smart API Usage: skip Gemini for empty / too-short transcripts ────────
  if (!text || text.trim().length < 20) {
    logger.warn(`Transcript too short (${text?.length ?? 0} chars) — skipping Gemini`);
    return generateFallback(text || "");
  }

  const trimmedText = text.trim();

  // ── Check cache first ─────────────────────────────────────────────────────
  const hash = hashTranscript(trimmedText);
  const cached = await getCache(hash);
  if (cached) {
    logger.info("Cache HIT — returning stored tasks (no Gemini call)");
    return cached;
  }
  logger.info("Cache MISS — calling Gemini API");

  // ── Call Gemini with fallback on failure ───────────────────────────────────
  try {
    const tasks = await callGemini(trimmedText);

    // Save successful result to cache (fire-and-forget)
    saveCache(hash, trimmedText, tasks);

    return tasks;
  } catch (error) {
    const is429 = error.message?.includes("429") || error.message?.includes("quota");
    const isNetwork = error.message?.includes("ECONNREFUSED") || error.message?.includes("ETIMEDOUT");

    if (is429) logger.error("Gemini quota exceeded (429) — using fallback");
    else if (isNetwork) logger.error("Gemini network error — using fallback");
    else logger.error("Gemini API error:", error.message, "— using fallback");

    return generateFallback(trimmedText);
  }
}