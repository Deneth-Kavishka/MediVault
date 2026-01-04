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
    console.log("Starting migration: Add profile_change_requests ...");

    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_add_profile_change_requests.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");
    console.log("Added/ensured:");
    console.log("  - profile_change_requests table");
    console.log("  - idx_profile_change_requests_* indexes");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
