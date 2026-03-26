import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole, requireAdmin } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("notificationRoutes");

router.use(verifyToken);

// ─── GET /api/notifications ──────────────────────────────────────────────────
// Admin only — sees all notifications targeted to admin role + personal
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    const { rows } = await pool.query(
      `SELECT n.*, m.title AS meeting_title
       FROM notifications n
       LEFT JOIN meetings m ON n.meeting_id = m.id
       WHERE n.target_role = 'admin' OR n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({ notifications: rows });
  } catch (error) {
    logger.error("GET /notifications error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ notification: rows[0] });
  } catch (error) {
    logger.error("PATCH /notifications/:id/read error:", error.message);
    next(error);
  }
});

// ─── POST /api/notifications/mark-all-read ───────────────────────────────────
// Admin only
router.post("/mark-all-read", requireAdmin, async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE target_role = 'admin' OR user_id = $1",
      [userId]
    );

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    logger.error("POST /notifications/mark-all-read error:", error.message);
    next(error);
  }
});

export default router;
