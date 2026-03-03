import express from "express";
import pool from "../database.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("adminRoutes");

// All admin routes require a valid JWT + admin role
router.use(verifyToken, requireRole("admin"));

/*
====================================
 GET /api/admin/faculty
 — List all registered faculty users
====================================
*/
router.get("/faculty", async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
      SELECT
        id,
        name,
        email,
        role,
        department,
        phone,
        bio,
        created_at,
        (SELECT COUNT(*) FROM tasks WHERE user_id = users.id)::int AS assigned_tasks
      FROM users
      WHERE role = 'faculty'
      ORDER BY name ASC
    `);
        return res.json({ faculty: rows, total: rows.length });
    } catch (err) {
        logger.error("GET /admin/faculty error:", err.message);
        next(err);
    }
});

/*
====================================
 GET /api/admin/faculty/:id/tasks
 — Get all tasks assigned to a specific faculty member
====================================
*/
router.get("/faculty/:id/tasks", async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify the target user is faculty
        const userCheck = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1 AND role = 'faculty'",
            [id]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "Faculty member not found" });
        }

        const { rows } = await pool.query(`
      SELECT id, title, description, status, priority, due_date, assigned_to, created_at
      FROM tasks
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [id]);

        return res.json({ member: userCheck.rows[0], tasks: rows });
    } catch (err) {
        logger.error("GET /admin/faculty/:id/tasks error:", err.message);
        next(err);
    }
});

/*
====================================
 POST /api/admin/assign-task
 — Admin assigns a task to a faculty member by user_id
====================================
*/
router.post("/assign-task", async (req, res, next) => {
    try {
        const { user_id, title, description, priority = "Medium", due_date } = req.body;

        if (!user_id || !title) {
            return res.status(400).json({ error: "user_id and title are required" });
        }

        // Verify target is faculty
        const target = await pool.query(
            "SELECT id, name FROM users WHERE id = $1 AND role = 'faculty'",
            [user_id]
        );
        if (target.rows.length === 0) {
            return res.status(404).json({ error: "Faculty member not found" });
        }

        const { rows } = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, user_id, created_by)
      VALUES ($1, $2, 'pending', $3, $4, $5, $6)
      RETURNING *
    `, [title, description || null, priority, due_date || null, user_id, req.user.id]);

        logger.info(`Admin ${req.user.id} assigned task "${title}" to faculty ${user_id} (${target.rows[0].name})`);
        return res.status(201).json({ task: rows[0], assignedTo: target.rows[0] });
    } catch (err) {
        logger.error("POST /admin/assign-task error:", err.message);
        next(err);
    }
});

/*
====================================
 PATCH /api/admin/faculty/:id/promote
 — Change a user's role (admin only)
====================================
*/
router.patch("/faculty/:id/role", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["admin", "faculty"].includes(role)) {
            return res.status(400).json({ error: "role must be 'admin' or 'faculty'" });
        }

        // Prevent self-demotion
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ error: "Cannot change your own role" });
        }

        const { rows } = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
            [role, id]
        );

        if (rows.length === 0) return res.status(404).json({ error: "User not found" });

        logger.info(`Admin ${req.user.id} changed user ${id} role to ${role}`);
        return res.json(rows[0]);
    } catch (err) {
        logger.error("PATCH /admin/faculty/:id/role error:", err.message);
        next(err);
    }
});

export default router;
