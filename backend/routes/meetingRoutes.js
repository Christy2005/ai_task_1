import express from "express";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("meetingRoutes");

router.use(verifyToken);

// ─── GET /api/meetings ───────────────────────────────────────────────────────
// All roles can view meetings list
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        m.*,
        u.name AS created_by_name,
        u.email AS created_by_email,
        COUNT(t.id) AS task_count
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN tasks t ON t.meeting_id = m.id
      GROUP BY m.id, u.name, u.email
      ORDER BY m.created_at DESC
    `);

    return res.json({ meetings: rows });
  } catch (error) {
    logger.error("GET /meetings error:", error.message);
    next(error);
  }
});

// ─── GET /api/meetings/:id ───────────────────────────────────────────────────
// Get single meeting with transcript and linked tasks
router.get("/:id", async (req, res, next) => {
  try {
    const meetingResult = await pool.query(
      `SELECT m.*, u.name AS created_by_name, u.email AS created_by_email
       FROM meetings m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const tasksResult = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email
       FROM tasks t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.meeting_id = $1
       ORDER BY t.created_at ASC`,
      [req.params.id]
    );

    return res.json({
      meeting: meetingResult.rows[0],
      tasks: tasksResult.rows,
    });
  } catch (error) {
    logger.error("GET /meetings/:id error:", error.message);
    next(error);
  }
});

export default router;
