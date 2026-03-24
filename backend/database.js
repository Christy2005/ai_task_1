import pkg from "pg";
import dotenv from "dotenv";

// 1. Validate environment
dotenv.config();

const { Pool } = pkg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ CRITICAL: DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

// 1. Log masked version of URL
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
console.log(`🔌 Initializing Database Connection. Using URL: ${maskedUrl}`);

// 4. Proper Neon configurations
const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// 5. Better error logging
function handleConnectionError(err) {
  if (err.code === "ENOTFOUND" || err.message.includes("getaddrinfo ENOTFOUND")) {
    console.error("❌ DNS Error (ENOTFOUND): Hostname could not be resolved. Ensure Neon DB host is correct and dns is reachable.");
  } else if (err.code === "ETIMEDOUT" || err.message.includes("timeout")) {
    console.error("❌ Connection Timeout: Database is physically unreachable.");
  } else if (err.code === "28P01" || err.message.includes("password authentication failed")) {
    console.error("❌ Authentication Failed: Invalid username or password in DATABASE_URL.");
  } else {
    console.error(`❌ DB Error: ${err.message}`);
  }
}

// 2 & 3. Startup check + Retry Logic
async function startDbCheck() {
  const maxRetries = 3;
  const delayMs = 2000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1"); // 2. Simple query check
      client.release();
      
      console.log("✅ Successfully connected to Neon PostgreSQL");
      return; 
    } catch (err) {
      console.error(`⚠️ Database connection attempt ${attempt}/${maxRetries} failed.`);
      handleConnectionError(err);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delayMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.error("❌ Database connection failed: check DATABASE_URL or Neon status");
      }
    }
  }
}

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client:", err.message);
});

// Fire up connection check
startDbCheck();

export default pool;