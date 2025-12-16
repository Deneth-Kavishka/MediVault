import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  console.log("🔄 Running database migration...");

  try {
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, "..", "migration_add_place_id.sql"),
      "utf-8"
    );

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");
    console.log("✅ Added place_id column to doctor_availability table");
    console.log("✅ Created indexes for performance");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
