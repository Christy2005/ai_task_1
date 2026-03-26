import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("calendarRoutes");

router.use(verifyToken);

// ─── GET /api/events ──────────────────────────────────────────────────────────
// Returns all events + auto-generates events from task due dates.
// Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/", async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const { id: userId, role } = req.user;

    // 1. Manual events (from events table)
    let eventsQuery = `
      SELECT e.*, u.name AS created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1`;
    const eventsParams = [];

    if (start) {
      eventsParams.push(start);
      eventsQuery += ` AND e.start_date >= $${eventsParams.length}`;
    }
    if (end) {
      eventsParams.push(end);
      eventsQuery += ` AND e.start_date <= $${eventsParams.length}`;
    }

    // Faculty only see events they created or events linked to their tasks
    if (role === "faculty") {
      eventsParams.push(userId);
      eventsQuery += ` AND (e.created_by = $${eventsParams.length} OR e.task_id IN (
        SELECT id FROM tasks WHERE user_id = $${eventsParams.length} AND approval_status = 'approved'
      ))`;
    }

    eventsQuery += " ORDER BY e.start_date ASC LIMIT 200";
    const { rows: manualEvents } = await pool.query(eventsQuery, eventsParams);

    // 2. Auto-generate events from task due dates (tasks with a due_date)
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

    // Convert task due dates to event shape (prefixed id so client can tell them apart)
    const taskEvents = taskRows.map((t) => ({
      id: `task-${t.id}`,
      title: `Due: ${t.title}`,
      description: `Assigned to: ${t.assigned_to_name || "Unassigned"}`,
      start_date: t.due_date,
      end_date: t.due_date,
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

// ─── POST /api/events ─────────────────────────────────────────────────────────
// Create a manual calendar event (admin/hod only)
router.post("/", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { title, description, start_date, end_date, all_day, color, meeting_id } = req.body;

    if (!title) return res.status(400).json({ error: "title is required" });
    if (!start_date) return res.status(400).json({ error: "start_date is required" });

    const { rows } = await pool.query(
      `INSERT INTO events (title, description, start_date, end_date, all_day, color, meeting_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description || null,
        start_date,
        end_date || null,
        all_day ?? false,
        color || "indigo",
        meeting_id || null,
        req.user.id,
      ]
    );

    logger.info(`Event created: "${title}" by ${req.user.role} ${req.user.id}`);
    return res.status(201).json({ event: rows[0] });
  } catch (error) {
    logger.error("POST /events error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/events/:id ────────────────────────────────────────────────────
// Update a manual event (admin/hod only)
router.patch("/:id", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { title, description, start_date, end_date, all_day, color } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (start_date !== undefined) { updates.push(`start_date = $${idx++}`); values.push(start_date); }
    if (end_date !== undefined) { updates.push(`end_date = $${idx++}`); values.push(end_date); }
    if (all_day !== undefined) { updates.push(`all_day = $${idx++}`); values.push(all_day); }
    if (color !== undefined) { updates.push(`color = $${idx++}`); values.push(color); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE events SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: "Event not found" });

    return res.json({ event: rows[0] });
  } catch (error) {
    logger.error("PATCH /events/:id error:", error.message);
    next(error);
  }
});

// ─── DELETE /api/events/:id ───────────────────────────────────────────────────
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
