import jwt from "jsonwebtoken";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("authMiddleware");

// ─── Verify JWT token ──────────────────────────────────────────────────────────
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id, email, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn("Invalid token:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ─── Role-based access factory ─────────────────────────────────────────────────
// Usage: requireRole("admin") or requireRole("admin", "faculty")
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied — user ${req.user.id} (role: ${req.user.role}) attempted ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};