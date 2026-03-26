import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("taskRoutes");

// All task routes require authentication
router.use(verifyToken);

// ─── GET /api/tasks ────────────────────────────────────────────────────────────
// Admin → all tasks
// HOD → all tasks (for approval workflow)
// Faculty → only APPROVED tasks assigned to them
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
      // Faculty: only see approved tasks assigned to them
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
// HOD + Admin: view tasks awaiting approval
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
// HOD + Admin: approve a task
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

    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Create notification for assigned faculty
    if (rows[0].user_id) {
      await pool.query(
        `INSERT INTO notifications (type, title, message, user_id)
         VALUES ('info', $1, $2, $3)`,
        [
          `Task Approved: ${rows[0].title}`,
          `Your task "${rows[0].title}" has been approved and is now active.`,
          rows[0].user_id,
        ]
      );
    }

    logger.info(`Task ${taskId} approved by ${req.user.role} ${req.user.id}`);
    return res.json({ task: rows[0] });
  } catch (error) {
    logger.error("PATCH /tasks/:id/approve error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/tasks/:id/reject ─────────────────────────────────────────────
// HOD + Admin: reject a task
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

    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    logger.info(`Task ${taskId} rejected by ${req.user.role} ${req.user.id}`);
    return res.json({ task: rows[0] });
  } catch (error) {
    logger.error("PATCH /tasks/:id/reject error:", error.message);
    next(error);
  }
});

// ─── POST /api/tasks ───────────────────────────────────────────────────────────
// Admin only — create and assign a task to a faculty member
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { title, description, user_id, due_date, priority = "Medium", status = "pending" } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!user_id) {
      return res.status(400).json({ error: "user_id (assigned faculty) is required" });
    }

    // Verify assignee exists and is a faculty member
    const assigneeCheck = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role IN ('faculty', 'hod')",
      [user_id]
    );

    if (assigneeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Faculty user not found" });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')
       RETURNING *`,
      [title, description || null, status, priority, due_date || null, user_id]
    );

    logger.info(`Task created: "${title}" assigned to ${user_id} by admin ${req.user.id}`);
    return res.status(201).json({ task: rows[0] });

  } catch (error) {
    logger.error("POST /tasks error:", error.message);
    next(error);
  }
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
// Admin: can update any field on any task
// Faculty: can only update status of tasks assigned to them
router.patch("/:id", async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const { id: userId, role } = req.user;

    // Fetch task first to verify ownership
    const taskResult = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];

    // Faculty can only update their own assigned tasks
    if (role === "faculty") {
      if (task.user_id !== userId) {
        return res.status(403).json({ error: "You can only update tasks assigned to you" });
      }

      // Faculty can only change status
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Faculty can only update task status" });
      }

      const { rows } = await pool.query(
        "UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *",
        [status, taskId]
      );
      logger.info(`Task ${taskId} status updated to "${status}" by faculty ${userId}`);
      return res.json({ task: rows[0] });
    }

    // Admin / HOD: allow updating any field
    const { title, description, status, priority, due_date, user_id } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (due_date !== undefined) { updates.push(`due_date = $${idx++}`); values.push(due_date); }
    if (user_id !== undefined) { updates.push(`user_id = $${idx++}`); values.push(user_id); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

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
// Admin only
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const { id: taskId } = req.params;

    const { rows } = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id, title",
      [taskId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    logger.info(`Task ${taskId} deleted by admin ${req.user.id}`);
    return res.json({ message: "Task deleted", task: rows[0] });

  } catch (error) {
    logger.error("DELETE /tasks/:id error:", error.message);
    next(error);
  }
});

export default router;
