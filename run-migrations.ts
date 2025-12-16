import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

// Database connection
const pool = new Pool({
  connectionString: "postgresql://medivault:Alpha@localhost:5432/medivault",
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
