import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import pool from "../database.js";
import { createLogger } from "../utils/logger.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
const logger = createLogger("authRoutes");

// ─── Rate limiter: 5 login attempts per 15 minutes per IP ─────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

const VALID_ROLES = ["admin", "hod", "faculty"];

/*
========================
        REGISTER
========================
*/
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "faculty" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const safeRole = VALID_ROLES.includes(role) ? role : "faculty";

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, safeRole]
    );

    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    logger.info(`Registered: ${user.email} (${user.role})`);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (error) {
    logger.error("Register error:", error.message);
    next(error);
  }
});


/*
========================
          LOGIN
========================
*/
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const result = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    logger.info(`Login: ${user.email} (${user.role})`);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (error) {
    logger.error("Login error:", error.message);
    next(error);
  }
});


/*
========================
   GET /me — My Profile
========================
*/
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, bio, department, phone, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    logger.error("GET /me error:", error.message);
    next(error);
  }
});


/*
========================
  PATCH /me — Update Profile
========================
*/
router.patch("/me", verifyToken, async (req, res, next) => {
  try {
    const { name, bio, department, phone, avatar_url } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
    if (department !== undefined) { updates.push(`department = $${idx++}`); values.push(department); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}
       RETURNING id, name, email, role, bio, department, phone, avatar_url`,
      values
    );

    logger.info(`Profile updated: user ${req.user.id}`);
    return res.json(rows[0]);
  } catch (error) {
    logger.error("PATCH /me error:", error.message);
    next(error);
  }
});
/*
========================
  GET /faculty — Admin: list all faculty users with task counts
========================
*/
router.get("/faculty", verifyToken, requireRole("admin", "hod"), async (req, res, next) => {
  try {

    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.department, u.phone,
        COUNT(t.id) FILTER (WHERE t.status != 'completed') AS active_tasks
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.id
      WHERE u.role = 'faculty'
      GROUP BY u.id
      ORDER BY u.name ASC
    `);

    return res.json({ faculty: rows });
  } catch (error) {
    logger.error("GET /faculty error:", error.message);
    next(error);
  }
});

export default router;