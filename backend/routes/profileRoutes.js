import express from "express";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createLogger } from "../utils/logger.js";

const router = express.Router();
const logger = createLogger("profileRoutes");

router.use(verifyToken);

// ─── GET /api/profile ──────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { id } = req.user;

    const { rows } = await pool.query(
      "SELECT name AS \"fullName\", email, role, department, phone, bio FROM users WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "success", data: rows[0] });
  } catch (error) {
    logger.error("GET /profile error:", error.message);
    next(error);
  }
});

// ─── PUT /api/profile ──────────────────────────────────────────────────────────
router.put("/", async (req, res, next) => {
  try {
    const { id } = req.user;
    const { department, phone, bio } = req.body;

    // name, email, and role are not updated here for security reasons, according to the plan.
    const { rows } = await pool.query(
      `UPDATE users 
       SET department = $1, phone = $2, bio = $3 
       WHERE id = $4
       RETURNING name AS "fullName", email, role, department, phone, bio`,
      [department, phone, bio, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "success", data: rows[0] });
  } catch (error) {
    logger.error("PUT /profile error:", error.message);
    next(error);
  }
});

export default router;
