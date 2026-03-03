import pkg from "pg";

// NOTE: dotenv is loaded in server.js before any imports resolve.
// We use a lazy getter so pool config is read at connection time,
// not at module parse time.
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Handles Neon serverless cold-start (~8s wake time)
});

pool.on("connect", () => {
  console.log("✅ Connected to Neon PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Database pool error:", err.message);
});

export default pool;