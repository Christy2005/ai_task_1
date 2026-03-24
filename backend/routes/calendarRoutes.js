import express from "express";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

// POST /api/calendar
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { title, description, event_date } = req.body;

    // Validation
    if (!title || !event_date) {
      return res.status(400).json({ error: "title and event_date are required" });
    }

    // Insert into calendar_events table
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (title, description, event_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description || "", event_date, req.user.id]
    );

    const insertedRow = rows[0];

    logger.info(`[post-calendar] User ${req.user.id} created calendar event ${insertedRow.id}`);

    return res.status(201).json({
      success: true,
      event: insertedRow,
    });
  } catch (err) {
    logger.error("[post-calendar] DB error:", err.message);
    next(err);
  }
});

export default router;
