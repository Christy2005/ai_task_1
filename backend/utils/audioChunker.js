/**
 * audioChunker.js
 * ───────────────
 * Splits a large audio file on disk into fixed-length segments using ffmpeg.
 * Requires: ffmpeg installed system-wide (verified at /usr/bin/ffmpeg).
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

/**
 * Split an audio file into chunks of `chunkMinutes` minutes each.
 *
 * @param {string} inputFilePath  Absolute path to the source audio file on disk.
 * @param {number} chunkMinutes   Duration of each segment (default: 8 minutes).
 * @returns {Promise<{ chunkDir: string, chunkPaths: string[] }>}
 *   chunkDir   — temp directory that CALLER must delete after processing.
 *   chunkPaths — ordered list of chunk file paths.
 */
export async function splitAudioIntoChunks(inputFilePath, chunkMinutes = 8) {
    // Create a unique temp directory per upload
    const sessionId = crypto.randomUUID();
    const chunkDir = path.join(
        path.dirname(inputFilePath),
        "chunks",
        sessionId
    );
    fs.mkdirSync(chunkDir, { recursive: true });

    const outputPattern = path.join(chunkDir, "chunk_%03d.mp3");
    const segmentSeconds = chunkMinutes * 60;

    /**
     * ffmpeg flags:
     *  -i          input file
     *  -f segment  use segment muxer
     *  -segment_time N   cut every N seconds
     *  -c copy     stream-copy (no re-encode → fast, lossless quality)
     *  -reset_timestamps 1  start each segment at t=0 (required by some decoders)
     *  -map 0:a    keep audio track only
     */
    const args = [
        "-y",                      // overwrite without asking
        "-i", inputFilePath,
        "-f", "segment",
        "-segment_time", String(segmentSeconds),
        "-c:a", "libmp3lame",      // re-encode to mp3 so every chunk is self-contained
        "-q:a", "4",               // ~165 kbps — good quality, reasonable size
        "-reset_timestamps", "1",
        "-map", "0:a",
        outputPattern,
    ];

    try {
        await execFileAsync("ffmpeg", args);
    } catch (err) {
        // Clean up chunk dir on failure
        fs.rmSync(chunkDir, { recursive: true, force: true });
        throw new Error(`ffmpeg chunking failed: ${err.message}`);
    }

    // Collect and sort chunk paths (chunk_000.mp3, chunk_001.mp3, …)
    const chunkPaths = fs
        .readdirSync(chunkDir)
        .filter((f) => f.startsWith("chunk_") && f.endsWith(".mp3"))
        .sort()
        .map((f) => path.join(chunkDir, f));

    if (chunkPaths.length === 0) {
        fs.rmSync(chunkDir, { recursive: true, force: true });
        throw new Error("ffmpeg produced no chunks — check input file format.");
    }

    return { chunkDir, chunkPaths };
}
