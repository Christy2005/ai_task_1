import express from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  speechToText,
  extractTaskDetails,
  generateMeetingSummary,
} from "../services/aiService.js";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("aiRoutes");

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

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
});

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

router.post(
  "/analyze-voice",
  verifyToken,
  requireRole("admin"),
  aiLimiter,
  upload.single("audio"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const transcript = await speechToText(
        req.file.buffer,
        req.file.mimetype
      );

      let summary = "Summary not available";

      try {
        summary = await generateMeetingSummary(transcript);
      } catch (err) {
        console.log("⚠️ Summary fallback used");
      }

      const { title, host, meeting_date } = req.body;

      const meetingResult = await pool.query(
        `INSERT INTO meetings (title, host, meeting_date, summary, transcript, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          title || "Untitled Meeting",
          host || "Unknown",
          meeting_date || new Date(),
          summary,
          transcript,
          req.user.id,
        ]
      );

      const meetingId = meetingResult.rows[0].id;

      const extractedRaw = await extractTaskDetails(transcript);

      let extractedTasks;

      try {
        const cleaned = extractedRaw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        extractedTasks = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        extractedTasks = [
          {
            title: "New Task",
            description: transcript,
            priority: "Medium",
          },
        ];
      }

      const savedTasks = [];

      for (const task of extractedTasks) {
        // ✅ HARD LIMITS
        const title = (task.title || "Untitled Task")
          .split(" ")
          .slice(0, 5)
          .join(" ");

        let description = task.description || "";
        description = description.split(" ").slice(0, 10).join(" ");

        const priority = task.priority || "Medium";
        const due_date = task.dueDate || null;
        const assigneeRaw = task.assignee || null;

        const resolvedUserId = await resolveFacultyId(assigneeRaw);

        const sql = `
          INSERT INTO tasks 
          (title, description, status, priority, due_date, user_id, created_by, meeting_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;

        const values = [
          title,
          description,
          "pending",
          priority,
          due_date,
          resolvedUserId,
          req.user.id,
          meetingId,
        ];

        const { rows } = await pool.query(sql, values);
        savedTasks.push(rows[0]);
      }

      return res.json({
        transcript,
        summary,
        tasks: savedTasks,
      });

    } catch (error) {
      logger.error("[analyze-voice] error:", error.message);
      next(error);
    }
  }
);

export default router;