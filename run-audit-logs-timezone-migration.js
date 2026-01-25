// Migration script to fix audit_logs created_at timezone handling
import "dotenv/config";
import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(shouldUseSsl(DATABASE_URL) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
});

async function migrate() {
  console.log("🔄 Running audit_logs timezone migration...");
  console.log(
    "📍 Using DATABASE_URL:",
    DATABASE_URL?.replace(/:[^:]*@/, ":****@")
  );

  try {
    const migrationSql = fs.readFileSync(
      path.join(__dirname, "migration_fix_audit_logs_timezone.sql"),
      "utf-8"
    );

    await pool.query(migrationSql);

    console.log("✅ audit_logs.created_at timezone migration applied!");
    console.log(
      "ℹ️ Restart the server and refresh the admin dashboard to see corrected times."
    );
  } catch (error) {
    console.error("❌ Migration failed:", error?.message || error);
    console.error("\n💡 Make sure:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. DATABASE_URL is correct");
    console.error("   3. You have permission to ALTER tables");
  } finally {
    await pool.end();
  }
}

migrate();
