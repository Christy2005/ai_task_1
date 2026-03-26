import jwt from "jsonwebtoken";
import pool from "../database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("authMiddleware");

// UUID v4 pattern — users.id is UUID in this database
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Verify JWT token (async — does a DB round-trip to confirm user exists) ────
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Debug: log what came out of the token ──────────────────────────────
    logger.debug(`[verifyToken] decoded id="${decoded.id}" role="${decoded.role}"`);

    // Validate the id is a UUID string
    if (!decoded.id || !UUID_RE.test(String(decoded.id))) {
      logger.warn(`[verifyToken] Rejected — id "${decoded.id}" is not a valid UUID.`);
      return res.status(401).json({
        error: "Invalid token, please login again",
        code: "STALE_TOKEN",
      });
    }

    // ── DB lookup: confirm user still exists ───────────────────────────────
    const { rows } = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [decoded.id]
    );

    logger.debug(`[verifyToken] DB lookup id="${decoded.id}" → found=${rows.length > 0}`);

    if (rows.length === 0) {
      logger.warn(`[verifyToken] User id="${decoded.id}" not found in DB.`);
      return res.status(401).json({
        error: "Invalid token, please login again",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach only what routes actually need — sourced from DB, not the token
    req.user = { id: rows[0].id, role: rows[0].role };
    next();
  } catch (err) {
    logger.warn(`[verifyToken] Error: ${err.message}`);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ─── Role-based access factory ─────────────────────────────────────────────────
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `[requireRole] Denied — user "${req.user.id}" (role: ${req.user.role}) → ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireHOD = requireRole("hod");
export const requireFaculty = requireRole("faculty");
