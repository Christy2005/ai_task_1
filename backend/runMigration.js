// runMigration.js

import pkg from "pg";
import dotenv from "dotenv";

dotenv.config(); // 🔥 IMPORTANT: loads .env

const { Pool } = pkg;

// 🔗 Connect to Neon using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  try {
    console.log("🚀 Running migration...");

    // ✅ Create meetings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        host TEXT,
        meeting_date DATE,
        summary TEXT,
        transcript TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ meetings table created (or already exists)");

    // ✅ Add meeting_id to tasks
    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
    `);

    console.log("✅ meeting_id column added to tasks");

    console.log("🎉 Migration completed successfully!");

  } catch (error) {
    console.error("❌ FULL ERROR:", error);
  } finally {
    await pool.end();
  }
}

runMigration();