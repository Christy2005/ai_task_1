import "../env.js"; // Bootstraps dotenv before pool
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../database.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../migrations");
  
  try {
    const files = fs.readdirSync(migrationsDir).sort();

    // Give pool a little edge if it's cold starting
    console.log("Starting migrations...");

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`Applying migration: ${file}...`);
      try {
        await pool.query(sql);
        console.log(`✅ Applied ${file}`);
      } catch (err) {
        console.error(`❌ Failed to apply ${file}:`, err.message);
        // Sometimes migrations fail harmlessly because constraints already exist,
        // but it's important to bubble up if it's a real issue. We'll proceed or exit
        // based on your exact needs, but process.exit on critical failure is safer.
        console.error("Halting migrations due to error.");
        process.exit(1);
      }
    }
    
    console.log("🎉 All migrations applied successfully!");
    process.exit(0);

  } catch (error) {
    console.error("Migration fatal error:", error);
    process.exit(1);
  }
}

runMigrations();
