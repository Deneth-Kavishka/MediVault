import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

function shouldUseSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ...(shouldUseSsl(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
});

const db = drizzle(pool);

async function runMigrations() {
  try {
    console.log("Starting migrations...");

    // Migration 1: Add completion details
    console.log("\n1. Adding completion details columns...");
    const migration1 = readFileSync(
      join(process.cwd(), "migration_add_completion_details.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(migration1));
    console.log("✅ Completion details columns added");

    // Migration 2: Update prescriptions
    console.log("\n2. Updating prescriptions schema...");
    const migration2 = readFileSync(
      join(process.cwd(), "migration_update_prescriptions.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(migration2));
    console.log("✅ Prescriptions schema updated");

    // Migration 3: Add cancelled_by field
    console.log("\n3. Adding cancelled_by field...");
    const migration3 = readFileSync(
      join(process.cwd(), "migration_add_cancelled_by.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(migration3));
    console.log("✅ Cancelled_by field added");

    // Migration 4: Add lab test report file metadata
    console.log("\n4. Adding lab test report file columns...");
    const migration4 = readFileSync(
      join(process.cwd(), "migration_add_lab_test_report_files.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(migration4));
    console.log("✅ Lab test report file columns added");

    // Migration 5: Add lab test reports table
    console.log("\n5. Creating lab test reports table...");
    const migration5 = readFileSync(
      join(process.cwd(), "migration_add_lab_test_reports_table.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(migration5));
    console.log("✅ Lab test reports table created");

    console.log("\n✅ All migrations completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
