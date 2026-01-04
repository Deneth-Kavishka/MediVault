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
    console.log("Starting migration: Add doctors.nic + doctors.gender ...");

    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_add_doctor_nic_gender.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");
    console.log("Added/ensured:");
    console.log("  - doctors.nic (VARCHAR)");
    console.log("  - doctors.gender (VARCHAR)");
    console.log("  - doctors_nic_unique constraint");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
