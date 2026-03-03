import express from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { speechToText, extractTaskDetails } from "../services/aiService.js";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

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
// If user is authenticated use their ID; otherwise fall back to IPv6-safe IP.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit reached. Try again in 1 hour." },
});

// ─── Helper: resolve assigned faculty user_id from name or email ───────────────
async function resolveFacultyId(nameOrEmail) {
  if (!nameOrEmail) return null;

  const term = nameOrEmail.trim().toLowerCase();

  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE role = 'faculty'
       AND (LOWER(email) = $1 OR LOWER(name) = $1)
     LIMIT 1`,
    [term]
  );

  return rows.length > 0 ? rows[0].id : null;
}

// ─── POST /api/ai/analyze-voice ───────────────────────────────────────────────
router.post(
  "/analyze-voice",
  verifyToken,
  aiLimiter,
  upload.single("audio"),
  async (req, res, next) => {
    logger.info(`[analyze-voice] Request from user ${req.user.id} (${req.user.role})`);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      logger.debug(
        `Processing file: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`
      );

      // ── 1. Speech → Text ─────────────────────────────────────────────────────
      const transcript = await speechToText(req.file.buffer, req.file.mimetype);
      logger.info("Transcript received, length:", transcript.length);

      // ── 2. Extract task details ───────────────────────────────────────────────
      const extractedRaw = await extractTaskDetails(transcript);
      logger.debug("Raw AI output:", extractedRaw);

      // ── 3. Safe JSON parse (handles ```json … ``` markdown fences) ────────────
      let extractedTasks;
      try {
        const cleaned = extractedRaw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        extractedTasks = Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseErr) {
        logger.warn("JSON parse failed, using fallback task:", parseErr.message);
        extractedTasks = [
          {
            title: "New Task",
            description: transcript,
            status: "pending",
            assigned_to: null,
            due_date: null,
            priority: "Medium",
          },
        ];
      }

      logger.debug("Extracted tasks:", JSON.stringify(extractedTasks, null, 2));

      // ── 4. Insert each task with ownership ───────────────────────────────────
      const savedTasks = [];
      const createdById = req.user.id;

      for (const task of extractedTasks) {
        const title = task.title || task.name || "Untitled Task";
        const description = task.description || task.details || null;
        const status = task.status || "pending";
        const priority = task.priority || "Medium";
        const due_date = task.due_date || task.dueDate || null;
        const assigneeRaw = task.assigned_to || task.assignee || null;

        // Resolve assignee name/email → actual faculty UUID
        const resolvedUserId = await resolveFacultyId(assigneeRaw);

        if (assigneeRaw && !resolvedUserId) {
          logger.warn(`Could not resolve faculty for assignee: "${assigneeRaw}" — setting user_id to NULL`);
        }

        const sql = `
          INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, user_id, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const values = [
          title,
          description,
          status,
          priority,
          due_date,
          assigneeRaw,    // keeps original text name for display
          resolvedUserId, // resolved UUID FK for RBAC filtering
          createdById,
        ];

        try {
          logger.debug("Inserting task:", { title, status, assigneeRaw, resolvedUserId });
          const { rows } = await pool.query(sql, values);
          savedTasks.push(rows[0]);
          logger.info(`Task saved: "${title}" → user_id=${resolvedUserId}`);
        } catch (dbErr) {
          logger.error("DB INSERT ERROR:", dbErr.message, "| values:", values);
          // Continue inserting remaining tasks even if one fails
        }
      }

      logger.info(`Saved ${savedTasks.length} / ${extractedTasks.length} tasks`);

      return res.json({ transcript, tasks: savedTasks });

    } catch (error) {
      logger.error("[analyze-voice] Unhandled error:", error.message);
      next(error);
    }
  }
);

export default router;