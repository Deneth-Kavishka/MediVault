// Migration script for password_reset_requests table
import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Use the DATABASE_URL from your .env file
const DATABASE_URL = "postgresql://medivault:Alpha@localhost:5432/medivault";

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  console.log("🔄 Running password reset requests migration...");
  console.log(
    "📍 Using DATABASE_URL:",
    DATABASE_URL?.replace(/:[^:]*@/, ":****@")
  );

  try {
    // Read the migration SQL file
    const migrationSql = fs.readFileSync(
      path.join(__dirname, "migration_add_password_reset_requests.sql"),
      "utf-8"
    );

    // Execute the migration
    await pool.query(migrationSql);

    console.log("✅ Password reset requests table created successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\n💡 Make sure:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. DATABASE_URL is correct");
    console.error("   3. You have permission to create tables");
  } finally {
    await pool.end();
  }
}

migrate();
