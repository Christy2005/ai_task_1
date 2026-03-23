// ⚠️ env.js MUST be the FIRST import
import "./env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";

import logger from "./utils/logger.js";
import pool from "./database.js";
import { verifyToken, requireRole } from "./middleware/authMiddleware.js";

const app = express();

/* =============================
   LOG START
============================= */
console.log("🔥 Initializing server...");

/* =============================
   CORS (MUST BE FIRST)
============================= */

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map(o => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Handle preflight requests */
app.options("*", cors());

/* =============================
   Security & Performance
============================= */

app.use(helmet());
app.use(compression());

/* =============================
   Body Parsing
============================= */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =============================
   Health Check
============================= */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Task API 🚀",
    env: process.env.NODE_ENV || "development",
  });
});

/* =============================
   ROUTES
============================= */

console.log("🔗 Mounting routes...");

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", meetingRoutes);

/* =============================
   Admin: Assign Task
============================= */

app.post(
  "/api/admin/assign-task",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { facultyId, title, deadline, priority = "Medium" } = req.body;

      if (!title) return res.status(400).json({ error: "Title is required" });
      if (!facultyId) return res.status(400).json({ error: "facultyId is required" });

      const assigneeCheck = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'faculty'",
        [facultyId]
      );

      if (assigneeCheck.rows.length === 0) {
        return res.status(404).json({ error: "Faculty user not found" });
      }

      const { rows } = await pool.query(
        `INSERT INTO tasks (title, status, priority, due_date, user_id, created_by)
         VALUES ($1, 'pending', $2, $3, $4, $5)
         RETURNING *`,
        [title, priority, deadline || null, facultyId, req.user.id]
      );

      logger.info(
        `[assign-task] "${title}" → faculty ${facultyId} by admin ${req.user.id}`
      );

      res.status(201).json({
        message: "Task assigned successfully",
        task: rows[0],
      });
    } catch (err) {
      logger.error("[assign-task] DB error:", err.message);
      next(err);
    }
  }
);

/* =============================
   Admin: Task Stats
============================= */

app.get(
  "/api/admin/task-stats",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          COALESCE(SPLIT_PART(u.name, ' ', 1), u.email) AS name,
          COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed,
          COUNT(t.id) FILTER (WHERE t.status != 'completed') AS pending
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id
        WHERE u.role = 'faculty'
        GROUP BY u.id, u.name, u.email
        ORDER BY COUNT(t.id) DESC
        LIMIT 8
      `);

      const data = rows.map((r) => ({
        name: r.name,
        completed: Number(r.completed),
        pending: Number(r.pending),
      }));

      res.json(data);
    } catch (err) {
      logger.error("[task-stats] DB error:", err.message);
      next(err);
    }
  }
);

/* =============================
   404 Handler
============================= */

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =============================
   Global Error Handler
============================= */

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  logger.error(`[${req.method}] ${req.originalUrl} → ${status}: ${err.message}`);

  if (process.env.NODE_ENV === "production") {
    return res.status(status).json({ error: "Internal Server Error" });
  }

  res.status(status).json({
    error: err.message,
    stack: err.stack,
  });
});

/* =============================
   START SERVER
============================= */

const PORT = process.env.PORT || 3000;

console.log("🚀 About to start server...");

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  logger.info(`Server started on port ${PORT}`);
});