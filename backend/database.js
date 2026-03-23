import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Debug log (IMPORTANT)
console.log("Using DB:", process.env.DATABASE_URL?.includes("neon") ? "Neon DB ✅" : "Local DB ❌");

pool.on("connect", () => {
  console.log("✅ Connected to Neon PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Database error:", err.message);
});

export default pool;