import express from "express";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("notificationRoutes");

router.use(verifyToken);

// ─── GET /api/notifications ──────────────────────────────────────────────────
// Role-based:
//   admin   → all admin-targeted notifications + personal
//   hod     → hod-targeted notifications + personal
//   faculty → personal only (task assignments)
router.get("/", async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    let query;
    let params;

    if (role === "admin") {
      query = `
        SELECT n.*, m.title AS meeting_title
        FROM notifications n
        LEFT JOIN meetings m ON n.meeting_id = m.id
        WHERE n.target_role = 'admin' OR n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 50`;
      params = [userId];
    } else if (role === "hod") {
      query = `
        SELECT n.*, m.title AS meeting_title
        FROM notifications n
        LEFT JOIN meetings m ON n.meeting_id = m.id
        WHERE n.target_role = 'hod' OR n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 50`;
      params = [userId];
    } else {
      // faculty — personal notifications only
      query = `
        SELECT n.*, m.title AS meeting_title
        FROM notifications n
        LEFT JOIN meetings m ON n.meeting_id = m.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 50`;
      params = [userId];
    }

    const { rows } = await pool.query(query, params);
    return res.json({ notifications: rows });
  } catch (error) {
    logger.error("GET /notifications error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// Any authenticated user can mark their own notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    // Admins can mark any notification; others only their own
    const ownershipClause =
      role === "admin" ? "" : "AND (user_id = $2 OR target_role = $3)";
    const params =
      role === "admin"
        ? [req.params.id]
        : [req.params.id, userId, role];

    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 ${ownershipClause}
       RETURNING *`,
      params
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
// Works for all roles — marks the notifications visible to this user as read
router.post("/mark-all-read", async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    if (role === "admin") {
      await pool.query(
        "UPDATE notifications SET is_read = TRUE WHERE target_role = 'admin' OR user_id = $1",
        [userId]
      );
    } else if (role === "hod") {
      await pool.query(
        "UPDATE notifications SET is_read = TRUE WHERE target_role = 'hod' OR user_id = $1",
        [userId]
      );
    } else {
      await pool.query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
        [userId]
      );
    }

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    logger.error("POST /notifications/mark-all-read error:", error.message);
    next(error);
  }
});

export default router;
