import express from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { speechToText, extractTaskDetails } from "../services/aiService.js";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";
import { parseAITasks, postProcessTasks } from "../utils/taskPostProcess.js";

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

      // 2. Text → AI task extraction
      const extractedRaw = await extractTaskDetails(transcript);
      logger.debug("Raw AI output:", extractedRaw);

      // 3. Parse + post-process (split names, resolve dates, match faculty)
      let rawTasks;
      try {
        rawTasks = parseAITasks(extractedRaw);
      } catch (parseErr) {
        logger.warn("JSON parse failed, returning fallback:", parseErr.message);
        rawTasks = [
          {
            title: "Review Meeting",
            assignee: "",
            dueDate: "",
            priority: "Medium",
            description: transcript,
          },
        ];
      }

      // Post-process without saving — no meeting_id yet
      const processedTasks = await postProcessTasks(rawTasks, null);

      logger.info(`Extracted ${processedTasks.length} tasks (not yet saved)`);

      // Return editable tasks + transcript to frontend
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
      const { title, transcript, audioFilename, tasks } = req.body;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "No tasks to save" });
      }

      // 1. Create meeting record
      const meetingTitle = title || "Untitled Meeting";
      const meetingResult = await pool.query(
        `INSERT INTO meetings (title, transcript, audio_filename, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [meetingTitle, transcript || null, audioFilename || null, req.user.id]
      );
      const meeting = meetingResult.rows[0];
      logger.info(`Meeting created: ${meeting.id} — "${meetingTitle}"`);

      // 2. Re-process tasks to catch any edits (re-match faculty, etc.)
      const processedTasks = await postProcessTasks(tasks, meeting.id);

      // 3. Insert each task
      const savedTasks = [];
      const createdById = req.user.id;

      for (const task of processedTasks) {
        const sql = `
          INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, user_id, created_by, meeting_id, approval_status)
          VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, 'pending_approval')
          RETURNING *
        `;
        const values = [
          task.title,
          task.description,
          task.priority,
          task.due_date,
          task.assignee_name,
          task.user_id,
          createdById,
          meeting.id,
        ];

        try {
          const { rows } = await pool.query(sql, values);
          savedTasks.push(rows[0]);
          logger.info(`Task saved: "${task.title}" → user_id=${task.user_id}`);
        } catch (dbErr) {
          logger.error("DB INSERT ERROR:", dbErr.message, "| values:", values);
        }
      }

      logger.info(`Saved ${savedTasks.length} / ${processedTasks.length} tasks for meeting ${meeting.id}`);

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

      // 2. Extract tasks
      const extractedRaw = await extractTaskDetails(transcript);
      let rawTasks;
      try {
        rawTasks = parseAITasks(extractedRaw);
      } catch {
        rawTasks = [{ title: "New Task", description: transcript, priority: "Medium", assignee: "" }];
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
            `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, user_id, created_by, meeting_id, approval_status)
             VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, 'pending_approval') RETURNING *`,
            [task.title, task.description, task.priority, task.due_date, task.assignee_name, task.user_id, req.user.id, meeting.id]
          );
          savedTasks.push(rows[0]);
        } catch (dbErr) {
          logger.error("DB INSERT ERROR:", dbErr.message);
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
