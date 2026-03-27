import express from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { speechToText, extractTaskDetails } from "../services/aiService.js";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";
import { parseAITasks, postProcessTasks, extractTasksFromTranscript } from "../utils/taskPostProcess.js";

const router = express.Router();
const logger = createLogger("aiRoutes");

// ─── Multer config ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/", "video/mp4"];
    if (allowedTypes.some((type) => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error("Only audio/video files are allowed"));
    }
  },
});

// ─── AI rate limiter: 10 requests/hour per user ────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit reached. Try again in 1 hour." },
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: POST /api/ai/extract
// Transcribe audio → extract tasks → return editable tasks (NOT saved yet)
// Allowed: admin, hod
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/extract",
  verifyToken,
  requireRole("admin", "hod"),
  aiLimiter,
  upload.single("audio"),
  async (req, res, next) => {
    logger.info(`[extract] Request from user ${req.user.id} (${req.user.role})`);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      logger.debug(
        `Processing file: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`
      );

      // 1. Speech → Text
      const transcript = await speechToText(req.file.buffer, req.file.mimetype);
      logger.info("Transcript received, length:", transcript.length);

      // 2. Text → AI task extraction + fallback
      let rawTasks;

      // Always run rule-based extraction — it's fast and reliable
      const ruleTasks = extractTasksFromTranscript(transcript);
      logger.info(`Rule-based extractor found ${ruleTasks.length} task(s)`);

      try {
        // Try Gemini first
        const extractedRaw = await extractTaskDetails(transcript);
        logger.debug("Raw AI output:", extractedRaw);
        const geminiTasks = parseAITasks(extractedRaw);
        logger.info(`Gemini extracted ${geminiTasks.length} task(s)`);

        // Use whichever method found MORE tasks — Gemini often merges them
        if (geminiTasks.length >= ruleTasks.length && geminiTasks.length > 0) {
          rawTasks = geminiTasks;
          logger.info("Using Gemini tasks (more or equal)");
        } else if (ruleTasks.length > 0) {
          rawTasks = ruleTasks;
          logger.info("Using rule-based tasks (found more than Gemini)");
        } else {
          rawTasks = geminiTasks;
          logger.info("Using Gemini tasks (rule-based found none)");
        }
      } catch (aiErr) {
        // Gemini failed OR JSON parse failed — use sentence-based extractor
        logger.warn("AI extraction failed, using transcript extractor:", aiErr.message);
        rawTasks = ruleTasks;
      }

      // Guarantee: never return empty
      if (!rawTasks || rawTasks.length === 0) {
        logger.warn("No tasks found by any method, using review placeholder");
        rawTasks = [
          {
            title: "[Review Required] Meeting Tasks",
            assignee: "Unassigned",
            dueDate: "",
            priority: "Medium",
            description: transcript.slice(0, 500) + (transcript.length > 500 ? "…" : ""),
            isFallback: true,
          },
        ];
      }

      // 3. Post-process without saving — no meeting_id yet
      const processedTasks = await postProcessTasks(rawTasks, null);

      logger.info(`Extracted ${processedTasks.length} tasks (not yet saved)`);

      return res.json({
        transcript,
        tasks: processedTasks,
        audioFilename: req.file.originalname,
      });

    } catch (error) {
      logger.error("[extract] Unhandled error:", error.message);
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: POST /api/ai/save
// Save edited tasks to DB + create meeting record
// Allowed: admin, hod
// Body: { title, transcript, audioFilename, tasks: [...edited tasks] }
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/save",
  verifyToken,
  requireRole("admin", "hod"),
  async (req, res, next) => {
    logger.info(`[save] Request from user ${req.user.id} (${req.user.role})`);

    try {
      const { title, transcript, audioFilename, tasks, approveAll = false } = req.body;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "No tasks to save" });
      }

      // 1. Verify user still exists in DB (guards against stale sessions)
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [req.user.id]);
      if (userCheck.rows.length === 0) {
        return res.status(401).json({ error: "User not found. Please log in again.", code: "STALE_TOKEN" });
      }

      // 2. Create meeting record
      const meetingTitle = title || "Untitled Meeting";
      const meetingResult = await pool.query(
        `INSERT INTO meetings (title, transcript, audio_filename, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [meetingTitle, transcript || null, audioFilename || null, req.user.id]
      );
      const meeting = meetingResult.rows[0];
      logger.info(`Meeting created: ${meeting.id} — "${meetingTitle}"`);

      // 3. Re-process tasks to catch any edits (re-match faculty, etc.)
      const processedTasks = await postProcessTasks(tasks, meeting.id);

      // 4. Insert each task
      const savedTasks = [];
      const approvalStatus = approveAll ? "approved" : "pending_approval";

      logger.info(`[save] Inserting ${processedTasks.length} task(s) — approval_status="${approvalStatus}"`);

      for (const task of processedTasks) {
        const values = [
          task.title,                  // $1 title
          task.description || null,    // $2 description
          task.priority || "Medium",   // $3 priority
          task.due_date || null,       // $4 due_date
          task.assignee_name || null,  // $5 assigned_to
          task.user_id || null,        // $6 user_id
          meeting.id,                  // $7 meeting_id
          approvalStatus,              // $8 approval_status
        ];

        logger.debug(
          `[save] INSERT → title="${task.title}" priority="${values[2]}" user_id=${values[5]} approval="${values[7]}"`
        );

        try {
          const { rows } = await pool.query(
            `INSERT INTO tasks
               (title, description, priority, due_date, assigned_to, user_id, meeting_id, approval_status, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
             RETURNING *`,
            values
          );
          savedTasks.push(rows[0]);
          logger.info(`[save] ✓ Task "${task.title}" saved — id=${rows[0].id} user_id=${values[5]}`);
        } catch (dbErr) {
          logger.error(`[save] ✗ INSERT failed for "${task.title}": ${dbErr.message}`);
          logger.error(`[save]   values: ${JSON.stringify(values)}`);
        }
      }

      logger.info(`[save] Done: ${savedTasks.length}/${processedTasks.length} tasks saved for meeting ${meeting.id}`);

      return res.json({ meeting, tasks: savedTasks });

    } catch (error) {
      logger.error("[save] Unhandled error:", error.message);
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY: POST /api/ai/analyze-voice (kept for backwards compatibility)
// Does both extract + save in one step
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/analyze-voice",
  verifyToken,
  requireRole("admin", "hod"),
  aiLimiter,
  upload.single("audio"),
  async (req, res, next) => {
    logger.info(`[analyze-voice] Request from user ${req.user.id} (${req.user.role})`);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. Speech → Text
      const transcript = await speechToText(req.file.buffer, req.file.mimetype);

      // 2. Extract tasks — same dual-path strategy as /extract
      const ruleTasks = extractTasksFromTranscript(transcript);
      let rawTasks;
      try {
        const extractedRaw = await extractTaskDetails(transcript);
        const geminiTasks = parseAITasks(extractedRaw);
        rawTasks = geminiTasks.length >= ruleTasks.length && geminiTasks.length > 0
          ? geminiTasks
          : ruleTasks.length > 0 ? ruleTasks : geminiTasks;
      } catch {
        rawTasks = ruleTasks;
      }

      // Guarantee: never empty
      if (!rawTasks || rawTasks.length === 0) {
        rawTasks = [{
          title: "[Review Required] Meeting Tasks",
          assignee: "Unassigned",
          dueDate: "",
          priority: "Medium",
          description: transcript.slice(0, 500) + (transcript.length > 500 ? "…" : ""),
        }];
      }

      // 3. Create meeting
      const meetingResult = await pool.query(
        `INSERT INTO meetings (title, transcript, audio_filename, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        ["Meeting", transcript, req.file.originalname, req.user.id]
      );
      const meeting = meetingResult.rows[0];

      // 4. Post-process + save
      const processedTasks = await postProcessTasks(rawTasks, meeting.id);
      const savedTasks = [];

      for (const task of processedTasks) {
        try {
          const { rows } = await pool.query(
            `INSERT INTO tasks
               (title, description, priority, due_date, assigned_to, user_id, meeting_id, approval_status, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_approval', 'pending')
             RETURNING *`,
            [task.title, task.description || null, task.priority || "Medium",
             task.due_date || null, task.assignee_name || null, task.user_id || null, meeting.id]
          );
          savedTasks.push(rows[0]);
          logger.info(`[analyze-voice] Task saved: "${task.title}" → user_id=${task.user_id}`);
        } catch (dbErr) {
          logger.error(`[analyze-voice] INSERT failed for "${task.title}": ${dbErr.message}`);
        }
      }

      return res.json({ transcript, tasks: savedTasks });

    } catch (error) {
      logger.error("[analyze-voice] Unhandled error:", error.message);
      next(error);
    }
  }
);

export default router;
