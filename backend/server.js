// ⚠️ env.js MUST be the FIRST import — it bootstraps process.env
// before any other module (especially database.js) runs.
import "./env.js";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

/* =============================
   Middleware
============================= */

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =============================
   Routes
============================= */

app.get("/", (req, res) => {
  res.json({ message: "Backend running 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

/* =============================
   Global Error Handler
============================= */

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

/* =============================
   Start Server
============================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});