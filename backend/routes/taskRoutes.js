import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("taskRoutes");

const VALID_STATUSES = ["pending", "in_progress", "completed"];

router.use(verifyToken);

// ─── GET /api/tasks ────────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    let query, params;

    if (role === "admin" || role === "hod") {
      query = `
        SELECT
          t.*,
          u.name  AS assigned_to_name,
          u.email AS assigned_to_email,
          m.title AS meeting_title
        FROM tasks t
        LEFT JOIN users u    ON t.user_id    = u.id
        LEFT JOIN meetings m ON t.meeting_id = m.id
        ORDER BY t.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT
          t.*,
          u.name  AS assigned_to_name,
          u.email AS assigned_to_email,
          m.title AS meeting_title
        FROM tasks t
        LEFT JOIN users u    ON t.user_id    = u.id
        LEFT JOIN meetings m ON t.meeting_id = m.id
        WHERE t.user_id = $1 AND t.approval_status = 'approved'
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    }

    const { rows } = await pool.query(query, params);
    return res.json({ tasks: rows });

  } catch (error) {
    logger.error("GET /tasks error:", error.message);
    next(error);
  }
});

// ─── GET /api/tasks/pending-approval ─────────────────────────────────────────
router.get("/pending-approval", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.*,
        u.name  AS assigned_to_name,
        u.email AS assigned_to_email,
        m.title AS meeting_title
      FROM tasks t
      LEFT JOIN users u    ON t.user_id    = u.id
      LEFT JOIN meetings m ON t.meeting_id = m.id
      WHERE t.approval_status = 'pending_approval'
      ORDER BY t.created_at DESC
    `);
    return res.json({ tasks: rows });
  } catch (error) {
    logger.error("GET /tasks/pending-approval error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/tasks/:id/approve ────────────────────────────────────────────
router.patch("/:id/approve", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { id: taskId } = req.params;

    const { rows } = await pool.query(
      `UPDATE tasks
       SET approval_status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, taskId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });

    const task = rows[0];

    // Notify assigned faculty
    if (task.user_id) {
      await pool.query(
        `INSERT INTO notifications (type, title, message, user_id)
         VALUES ('info', $1, $2, $3)`,
        [
          `Task Approved: ${task.title}`,
          `Your task "${task.title}" has been approved and is now active.`,
          task.user_id,
        ]
      ).catch((e) => logger.error("Notification insert failed:", e.message));
    }

    // Auto-create calendar event for the task due date (skip if one already exists)
    if (task.due_date) {
      await pool.query(
        `INSERT INTO events (title, description, start_date, end_date, all_day, color, task_id, created_by)
         SELECT $1, $2, $3, $3, true, $4, $5, $6
         WHERE NOT EXISTS (SELECT 1 FROM events WHERE task_id = $5)`,
        [
          `Due: ${task.title}`,
          task.description || null,
          task.due_date,
          task.priority === "High" ? "red" : task.priority === "Medium" ? "amber" : "blue",
          task.id,
          req.user.id,
        ]
      ).catch((e) => logger.error("Calendar event insert failed:", e.message));
    }

    logger.info(`Task ${taskId} approved by ${req.user.role} ${req.user.id}`);
    return res.json({ task });
  } catch (error) {
    logger.error("PATCH /tasks/:id/approve error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/tasks/:id/reject ─────────────────────────────────────────────
router.patch("/:id/reject", requireRole("admin", "hod"), async (req, res, next) => {
  try {
    const { id: taskId } = req.params;

    const { rows } = await pool.query(
      `UPDATE tasks
       SET approval_status = 'rejected', approved_by = $1, approved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, taskId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });

    logger.info(`Task ${taskId} rejected by ${req.user.role} ${req.user.id}`);
    return res.json({ task: rows[0] });
  } catch (error) {
    logger.error("PATCH /tasks/:id/reject error:", error.message);
    next(error);
  }
});

// ─── POST /api/tasks ───────────────────────────────────────────────────────────
// Admin only — directly assign an approved task to faculty
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { title, description, user_id, due_date, priority = "Medium", status = "pending" } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const safeStatus = VALID_STATUSES.includes(status) ? status : "pending";

    const assigneeCheck = await pool.query(
      "SELECT id, name FROM users WHERE id = $1 AND role IN ('faculty', 'hod')",
      [user_id]
    );
    if (assigneeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Faculty user not found" });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')
       RETURNING *`,
      [title, description || null, safeStatus, priority, due_date || null, user_id]
    );

    const task = rows[0];

    // Notify faculty of direct assignment
    await pool.query(
      `INSERT INTO notifications (type, title, message, user_id)
       VALUES ('info', $1, $2, $3)`,
      [
        `New Task Assigned: ${title}`,
        `You have been assigned a new task: "${title}"${due_date ? `. Due: ${due_date}` : ""}.`,
        user_id,
      ]
    ).catch((e) => logger.error("Notification insert failed:", e.message));

    logger.info(`Task "${title}" assigned to ${assigneeCheck.rows[0].name} by admin ${req.user.id}`);
    return res.status(201).json({ task });

  } catch (error) {
    logger.error("POST /tasks error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
// Admin/HOD: update any field   Faculty: status only (own tasks)
router.patch("/:id", async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const { id: userId, role } = req.user;

    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: "Task not found" });

    const task = taskResult.rows[0];

    if (role === "faculty") {
      if (task.user_id !== userId) {
        return res.status(403).json({ error: "You can only update tasks assigned to you" });
      }
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Provide status to update" });
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      const { rows } = await pool.query(
        "UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *",
        [status, taskId]
      );
      logger.info(`Task ${taskId} status → "${status}" by faculty ${userId}`);
      return res.json({ task: rows[0] });
    }

    // Admin / HOD
    const { title, description, status, priority, due_date, user_id } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined)       { updates.push(`title = $${idx++}`);       values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      updates.push(`status = $${idx++}`); values.push(status);
    }
    if (priority !== undefined)    { updates.push(`priority = $${idx++}`);    values.push(priority); }
    if (due_date !== undefined)    { updates.push(`due_date = $${idx++}`);    values.push(due_date); }
    if (user_id !== undefined)     { updates.push(`user_id = $${idx++}`);     values.push(user_id); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(taskId);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info(`Task ${taskId} updated by ${role} ${userId}`);
    return res.json({ task: rows[0] });

  } catch (error) {
    logger.error("PATCH /tasks/:id error:", error.message);
    next(error);
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id, title",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
    logger.info(`Task ${req.params.id} deleted by admin ${req.user.id}`);
    return res.json({ message: "Task deleted", task: rows[0] });
  } catch (error) {
    logger.error("DELETE /tasks/:id error:", error.message);
    next(error);
  }
});

export default router;
