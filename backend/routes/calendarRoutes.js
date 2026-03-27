import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("calendarRoutes");

router.use(verifyToken);

// ─── GET /api/events ──────────────────────────────────────────────────────────
// Returns all events + auto-generates events from task due dates.
// Faculty see: events they created, events they're a participant of,
//              and events linked to their approved tasks.
// Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/", async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const { id: userId, role } = req.user;

    // 1. Manual events with participant info
    let eventsQuery = `
      SELECT e.*, u.name AS created_by_name,
             COALESCE(
               json_agg(
                 json_build_object('id', pu.id, 'name', pu.name, 'email', pu.email)
               ) FILTER (WHERE pu.id IS NOT NULL),
               '[]'
             ) AS participants
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_participants ep ON ep.event_id = e.id
      LEFT JOIN users pu ON pu.id = ep.user_id
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

    // Faculty see events they created, are a participant of, or linked to their tasks
    if (role === "faculty") {
      eventsParams.push(userId);
      const p = eventsParams.length;
      eventsQuery += ` AND (
        e.created_by = $${p}
        OR e.id IN (SELECT event_id FROM event_participants WHERE user_id = $${p})
        OR e.task_id IN (SELECT id FROM tasks WHERE user_id = $${p} AND approval_status = 'approved')
      )`;
    }

    eventsQuery += " GROUP BY e.id, u.name ORDER BY e.start_date ASC LIMIT 200";
    const { rows: manualEvents } = await pool.query(eventsQuery, eventsParams);

    // 2. Auto-generate events from task due dates
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
      start_date: t.due_date,
      end_date: t.due_date,
      all_day: true,
      color: t.priority === "High" ? "red" : t.priority === "Medium" ? "amber" : "blue",
      task_id: t.id,
      is_task_event: true,
      participants: [],
    }));

    return res.json({ events: [...manualEvents, ...taskEvents] });
  } catch (error) {
    logger.error("GET /events error:", error.message);
    next(error);
  }
});

// ─── POST /api/events ─────────────────────────────────────────────────────────
// Create a calendar event.
// Admin/HOD can create and assign participants.
// Faculty can create personal events (no participants).
router.post("/", async (req, res, next) => {
  try {
    const { title, description, start_date, end_date, all_day, color, meeting_id, participants } = req.body;
    const { id: userId, role } = req.user;

    if (!title) return res.status(400).json({ error: "title is required" });
    if (!start_date) return res.status(400).json({ error: "start_date is required" });

    // Faculty can only create personal events — no participants allowed
    if (role === "faculty" && participants?.length > 0) {
      return res.status(403).json({ error: "Faculty cannot assign participants to events" });
    }

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
        userId,
      ]
    );

    const event = rows[0];

    // Insert participants (admin/hod only, validated above)
    if (participants?.length > 0) {
      const values = participants.map((_, i) => `($1, $${i + 2})`).join(", ");
      const params = [event.id, ...participants];
      await pool.query(
        `INSERT INTO event_participants (event_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        params
      );
    }

    // Fetch back with participants
    const { rows: full } = await pool.query(
      `SELECT e.*, u.name AS created_by_name,
              COALESCE(
                json_agg(json_build_object('id', pu.id, 'name', pu.name, 'email', pu.email))
                FILTER (WHERE pu.id IS NOT NULL), '[]'
              ) AS participants
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN event_participants ep ON ep.event_id = e.id
       LEFT JOIN users pu ON pu.id = ep.user_id
       WHERE e.id = $1
       GROUP BY e.id, u.name`,
      [event.id]
    );

    logger.info(`Event created: "${title}" by ${role} ${userId} with ${participants?.length || 0} participant(s)`);
    return res.status(201).json({ event: full[0] });
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
