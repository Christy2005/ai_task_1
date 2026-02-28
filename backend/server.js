import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();

/* =============================
   Middleware
============================= */

app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =============================
   Routes
============================= */

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Backend running 🚀" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// AI routes
app.use("/api/ai", aiRoutes);

/* =============================
   Global Error Handler
============================= */

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

/* =============================
   Start Server
============================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});