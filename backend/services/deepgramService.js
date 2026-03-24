/**
 * deepgramService.js
 * ──────────────────
 * Transcribes audio chunk files using fetch + fs.createReadStream().
 *
 * WHY fetch + ReadStream (not SDK, not https.request + pipe):
 *
 *   - SDK:            internally calls readFileSync / buffers → same timeout
 *   - https + pipe:   sends 64 KB disk bursts with I/O gaps → rate-limiter fires
 *   - fetch + stream: node-fetch pipes the ReadStream as Transfer-Encoding: chunked,
 *                     letting the TCP layer flush bytes continuously without waiting
 *                     for Content-Length negotiation. No gaps → no SLOW_UPLOAD.
 *
 * Common SLOW_UPLOAD mistakes (all avoided here):
 *   ✗  fs.readFileSync → entire buffer in memory, sent in one burst that TCP segments
 *   ✗  Content-Length + pipe → https waits to fill each TCP window before flushing
 *   ✗  await body.text() before pipe ends → stalls the upload mid-stream
 *   ✓  createReadStream as fetch body → continuous chunked stream, TCP flushes ASAP
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("deepgramService");

const DEEPGRAM_URL =
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true";

/** MIME type lookup by file extension. */
const MIME_MAP = {
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] ?? "audio/mpeg"; // safe default
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Transcribe a single chunk file with retry + exponential back-off.
 *
 * @param {string} filePath    Absolute path to the chunk file on disk.
 * @param {number} maxRetries  Max attempts (default 3).
 * @returns {Promise<string>}  Transcript (may be empty for silent chunks).
 */
export async function transcribeChunk(filePath, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transcript = await _streamToDeepgram(filePath);
            return transcript;
        } catch (err) {
            lastError = err;
            logger.warn(
                `[deepgramService] Chunk ${path.basename(filePath)} failed ` +
                `(attempt ${attempt}/${maxRetries}): ${err.message}`
            );

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 2 s → 4 s → 8 s
                logger.info(`[deepgramService] Retrying in ${delay / 1000}s…`);
                await _sleep(delay);
            }
        }
    }

    throw new Error(
        `All ${maxRetries} attempts failed for ${path.basename(filePath)}: ${lastError?.message}`
    );
}

/**
 * Transcribe all chunks sequentially (one at a time to respect rate limits).
 *
 * @param {string[]} chunkPaths  Ordered list of chunk file paths.
 * @returns {Promise<string[]>}  Ordered transcript strings.
 */
export async function transcribeAllChunks(chunkPaths) {
    const transcripts = [];

    for (let i = 0; i < chunkPaths.length; i++) {
        logger.info(
            `[deepgramService] Transcribing chunk ${i + 1}/${chunkPaths.length}: ` +
            path.basename(chunkPaths[i])
        );
        const text = await transcribeChunk(chunkPaths[i]);
        transcripts.push(text);
        logger.info(
            `[deepgramService] Chunk ${i + 1} complete (${text.length} chars).`
        );
    }

    return transcripts;
}

/**
 * Join ordered transcript strings into one string.
 *
 * @param {string[]} transcripts
 * @returns {string}
 */
export function mergeTranscripts(transcripts) {
    return transcripts
        .map((t) => t.trim())
        .filter(Boolean)
        .join(" ");
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * POST a file to Deepgram using fetch + ReadStream (chunked transfer encoding).
 *
 * Key design points:
 *   - No Content-Length header → Transfer-Encoding: chunked
 *     → TCP pushes each disk read immediately, no rate-drop gaps
 *   - node-fetch v3 accepts a Node.js ReadableStream as body natively
 *   - AbortController enforces a per-chunk timeout (5 min)
 */
async function _streamToDeepgram(filePath) {
    if (!process.env.DEEPGRAM_API_KEY) {
        throw new Error("DEEPGRAM_API_KEY is not set");
    }

    const mimeType = getMimeType(filePath);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min

    let response;
    try {
        response = await fetch(DEEPGRAM_URL, {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
                "Content-Type": mimeType,
                // ⚠️  NO Content-Length — lets node-fetch use chunked streaming
            },
            body: fs.createReadStream(filePath),
        });
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Deepgram upload timed out after 5 minutes");
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(
            `Deepgram ${response.status}: ${responseText}`
        );
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        throw new Error(`Deepgram returned non-JSON: ${responseText.slice(0, 200)}`);
    }

    // Extract transcript — empty string is valid (e.g. silence-only segment)
    return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}

function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
