// ⚠️ env.js MUST be the FIRST import — bootstraps process.env
import "./env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import logger from "./utils/logger.js";

const app = express();

/* =============================
   Security & Perf Middleware
============================= */

// Set secure HTTP headers
app.use(helmet());

// Compress response bodies
app.use(compression());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map(o => o.trim())
  : [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =============================
   Health Check
============================= */

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AI Task API 🚀", env: process.env.NODE_ENV || "development" });
});

/* =============================
   API Routes
============================= */

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);

/* =============================
   404 Handler
============================= */

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =============================
   Global Error Handler
============================= */

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  logger.error(
    `[${req.method}] ${req.originalUrl} → ${status}: ${err.message}`
  );

  if (process.env.NODE_ENV === "production") {
    return res.status(status).json({ error: "Internal Server Error" });
  }

  return res.status(status).json({
    error: err.message,
    ...(err.stack ? { stack: err.stack } : {}),
  });
});

/* =============================
   Start Server
============================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
});