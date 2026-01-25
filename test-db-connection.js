import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env");
}

function shouldUseSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

console.log("Testing database connection...");
console.log("DATABASE_URL:", DATABASE_URL.replace(/:[^:]*@/, ":****@"));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(shouldUseSsl(DATABASE_URL) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
});

try {
  const client = await pool.connect();
  console.log("✅ Successfully connected to PostgreSQL!");

  const result = await client.query("SELECT current_database(), current_user;");
  console.log("Database:", result.rows[0].current_database);
  console.log("User:", result.rows[0].current_user);

  client.release();
  await pool.end();
  console.log("✅ Connection test passed!");
} catch (err) {
  console.error("❌ Connection failed:");
  console.error("Error:", err.message);
  console.error("\nPlease check:");
  console.error("1. DATABASE_URL is correct");
  console.error("2. Railway/PostgreSQL is reachable from this machine");
  console.error("3. Your DB user has required permissions");
  await pool.end();
  process.exit(1);
}
