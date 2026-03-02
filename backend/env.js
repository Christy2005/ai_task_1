// This file MUST be the first import in server.js.
// In ESM, imports are hoisted - so this module runs before any other
// module's code, including database.js, ensuring process.env is populated
// before the Pool is instantiated.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const result = dotenv.config({ path: path.join(__dirname, ".env") });

if (result.error) {
    console.error("❌ Failed to load .env:", result.error.message);
    process.exit(1);
}

console.log(`✅ Env loaded: DATABASE_URL starts with "${process.env.DATABASE_URL?.slice(0, 30)}..."`);
