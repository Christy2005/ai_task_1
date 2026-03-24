import https from "https";
import crypto from "crypto";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";
import pool from "../database.js";
import { createLogger } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// ─── Rule-Based NLP Task Extraction ─────────────────────────────────────────

export async function extractTaskDetails(transcript) {
  const prompt = `
Extract ONLY clear task assignments from the following transcript.

You MUST return a STRICT JSON array of objects.
Do NOT include any markdown formatting or backticks like \`\`\`json.
Do NOT include any explanation text.
If there are no clear tasks assigned to specific people, return an empty array [].

Each object MUST follow exactly this format:
{
  "title": "short clear action (max 5 words)",
  "description": "short explanation of the task",
  "assignee": "exact person name mentioned",
  "priority": "Medium",
  "dueDate": null
}

RULES:
- Extract assignee names if mentioned. Do NOT use words like "And", "Guys", "We", etc as names.
- If no assignee is clear, DO NOT extract the task.
- Detect explicit due dates only, otherwise null.
- DO NOT guess random tasks or generate "General Task".

Transcript: 
"${transcript}"
`;

  async function attemptExtraction() {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let rawContent = response.choices[0].message.content.trim();
    
    // Fallback un-markdown just in case
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not a JSON array");
    }
    return parsed;
  }

  try {
    return await attemptExtraction();
  } catch (error1) {
    logger.warn("First OpenAI extraction failed:", error1.message);
    try {
      // Retry once natively
      return await attemptExtraction();
    } catch (error2) {
      logger.error("Second OpenAI extraction failed:", error2.message);
      return [];
    }
  }
}