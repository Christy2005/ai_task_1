import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("calendarRoutes");

router.use(verifyToken);

/**
 * GET /api/events
 * Returns manual events and events generated from task due dates.
 * Optional query params: start=YYYY-MM-DD, end=YYYY-MM-DD
 */
router.get("/", async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const { id: userId, role } = req.user;

    // ── Manual events ────────────────────────────────
    let eventsQuery = `SELECT e.*, u.name AS created_by_name 
                       FROM events e
                       LEFT JOIN users u ON e.user_id = u.id
                       WHERE 1=1`;
    const eventsParams = [];

    if (start) {
      eventsParams.push(start);
      eventsQuery += ` AND e.date >= $${eventsParams.length}`;
    }
    if (end) {
      eventsParams.push(end);
      eventsQuery += ` AND e.date <= $${eventsParams.length}`;
    }

    // Faculty sees only their own events
    if (role === "faculty") {
      eventsParams.push(userId);
      eventsQuery += ` AND e.user_id = $${eventsParams.length}`;
    }

    eventsQuery += " ORDER BY e.date ASC LIMIT 200";
    const { rows: manualEvents } = await pool.query(eventsQuery, eventsParams);

    // ── Auto-generated task events ─────────────────────
    let tasksQuery = `
      SELECT t.id, t.title, t.due_date, t.priority, t.approval_status,
             u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.due_date IS NOT NULL
        AND t.approval_status = 'approved'`;
    const tasksParams = [];

    if (role === "faculty") {
      tasksParams.push(userId);
      tasksQuery += ` AND t.user_id = $${tasksParams.length}`;
    }

    if (start) {
      tasksParams.push(start);
      tasksQuery += ` AND t.due_date >= $${tasksParams.length}`;
    }
    if (end) {
      tasksParams.push(end);
      tasksQuery += ` AND t.due_date <= $${tasksParams.length}`;
    }

    tasksQuery += " ORDER BY t.due_date ASC LIMIT 200";
    const { rows: taskRows } = await pool.query(tasksQuery, tasksParams);

    const taskEvents = taskRows.map((t) => ({
      id: `task-${t.id}`,
      title: `Due: ${t.title}`,
      description: `Assigned to: ${t.assigned_to_name || "Unassigned"}`,
      date: t.due_date,
      all_day: true,
      color: t.priority === "High" ? "red" : t.priority === "Medium" ? "amber" : "blue",
      task_id: t.id,
      is_task_event: true,
    }));

    return res.json({ events: [...manualEvents, ...taskEvents] });
  } catch (error) {
    logger.error("GET /events error:", error.message);
    next(error);
  }
});

/**
 * POST /api/events
 * Create a manual calendar event (admin/hod only)
 */
router.post("/", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { title, description, date } = req.body;

    if (!title) return res.status(400).json({ error: "title is required" });
    if (!date) return res.status(400).json({ error: "date is required" });

    const { rows } = await pool.query(
      `INSERT INTO events (title, description, date, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description || null, date, req.user.id]
    );

    logger.info(`Event created: "${title}" by ${req.user.role} ${req.user.id}`);
    return res.status(201).json({ event: rows[0] });
  } catch (error) {
    logger.error("POST /events error:", error.message);
    next(error);
  }
});

/**
 * PATCH /api/events/:id
 * Update a manual event (admin/hod only)
 */
router.patch("/:id", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { title, description, date } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (date !== undefined) { updates.push(`date = $${idx++}`); values.push(date); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE events SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: "Event not found" });

    logger.info(`Event ${req.params.id} updated by ${req.user.role} ${req.user.id}`);
    return res.json({ event: rows[0] });
  } catch (error) {
    logger.error("PATCH /events/:id error:", error.message);
    next(error);
  }
});

/**
 * DELETE /api/events/:id
 * Delete a manual event (admin/hod only)
 */
router.delete("/:id", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM events WHERE id = $1 RETURNING id, title",
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Event not found" });

    logger.info(`Event ${req.params.id} deleted by ${req.user.role} ${req.user.id}`);
    return res.json({ message: "Event deleted", event: rows[0] });
  } catch (error) {
    logger.error("DELETE /events/:id error:", error.message);
    next(error);
  }
});

export default router;