import https from "https";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("aiService");

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

// ─── Gemini: Text → Task Extraction ───────────────────────────────────────────
export async function extractTaskDetails(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are a meeting-task extraction engine. Extract ALL action items from the transcript below.

RULES:
1. Return ONLY a valid JSON array — no markdown fences, no commentary, no explanation.
2. Each element must be an object with exactly these keys (no extras):
   - "title"       (string, concise action item)
   - "assignee"    (string, full name of the person responsible — if multiple people share the SAME task, list them comma-separated in ONE string; if different tasks, create SEPARATE objects)
   - "dueDate"     (string, use ISO "YYYY-MM-DD" format; convert relative dates using today = ${today}; use "" if unknown)
   - "priority"    (string, exactly one of: "Low", "Medium", "High")
   - "description" (string, brief context from the meeting)
3. If no tasks are found, return an empty array: []
4. Do NOT invent tasks that aren't in the transcript.
5. Separate distinct tasks into distinct objects — one task per object.

Transcript:
"""
${text}
"""

JSON:`;

  try {
    logger.info("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    if (!result?.response) throw new Error("No response from Gemini API");
    const responseText = result.response.text();
    logger.debug("Gemini response length:", responseText.length);
    return responseText;
  } catch (error) {
    logger.error("Gemini API error:", error.message);
    throw error;
  }
}