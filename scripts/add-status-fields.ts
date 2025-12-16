import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("Starting migration: Add status tracking fields...");

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_add_status_fields.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");
    console.log("Added columns:");
    console.log("  - deleted_at (timestamp)");
    console.log("  - deleted_by (varchar)");
    console.log("  - deactivated_by (varchar)");
    console.log("  - deactivated_at (timestamp)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
