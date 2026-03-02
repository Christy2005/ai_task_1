import express from "express";
import multer from "multer";
import { speechToText, extractTaskDetails } from "../services/aiService.js";
import pool from "../database.js";

const router = express.Router();

// ─── Multer config ────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/", "video/mp4"];
    if (allowedTypes.some((type) => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error("Only audio/video files allowed"));
    }
  },
});

// ─── Verify DB connection on startup ─────────────────────────────────────────
(async () => {
  try {
    const client = await pool.connect();
    const { rows } = await client.query("SELECT current_database()");
    console.log("✅ DB connected — current_database:", rows[0].current_database);
    client.release();
  } catch (err) {
    console.error("❌ DB connection check failed:", err.message);
  }
})();

// ─── POST /api/ai/analyze-voice ───────────────────────────────────────────────
router.post("/analyze-voice", upload.single("audio"), async (req, res) => {
  console.log("🔵 [analyze-voice] Route hit");

  try {
    if (!req.file) {
      console.warn("⚠️  No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`🚀 Processing file: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

    // ── 1. Speech → Text ──────────────────────────────────────────────────────
    const transcript = await speechToText(req.file.buffer, req.file.mimetype);
    console.log("📝 Transcript:", transcript);

    // ── 2. Extract task details ───────────────────────────────────────────────
    const extractedRaw = await extractTaskDetails(transcript);
    console.log("🤖 Raw AI output:", extractedRaw);

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
      console.error("⚠️  JSON parse failed, using fallback task:", parseErr.message);
      extractedTasks = [
        {
          title: "New Task",
          description: transcript,
          status: "pending",
          assigned_to: null,
          due_date: null,
        },
      ];
    }

    console.log("📋 Extracted tasks before DB insert:", JSON.stringify(extractedTasks, null, 2));

    // ── 4. Insert each task into Neon PostgreSQL ──────────────────────────────
    const savedTasks = [];

    for (const task of extractedTasks) {
      const title = task.title || task.name || "Untitled Task";
      const description = task.description || task.details || null;
      const status = task.status || "pending";
      const assigned_to = task.assigned_to || task.assignee || null;
      const due_date = task.due_date || task.dueDate || null;

      const sql = `
        INSERT INTO tasks (title, description, status, assigned_to, due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [title, description, status, assigned_to, due_date];

      try {
        console.log("💾 Inserting task:", { title, description, status, assigned_to, due_date });
        const { rows } = await pool.query(sql, values);
        savedTasks.push(rows[0]);
        console.log("✅ Task saved:", rows[0]);
      } catch (dbErr) {
        console.error("❌ DB INSERT ERROR:", dbErr.message);
        console.error("   Failed values:", values);
        // Continue inserting remaining tasks even if one fails
      }
    }

    console.log(`📦 Saved ${savedTasks.length} / ${extractedTasks.length} tasks to DB`);

    // ── 5. Respond ────────────────────────────────────────────────────────────
    return res.json({ transcript, tasks: savedTasks });

  } catch (error) {
    console.error("❌ [analyze-voice] Unhandled error:", error.message);
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;