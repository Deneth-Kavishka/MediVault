import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function runMigration() {
  try {
    console.log("🔄 Running prescription scan tracking migration...\n");

    const migrationSQL = fs.readFileSync(
      "migration_add_prescription_scan_tracking.sql",
      "utf-8"
    );

    // Execute the entire ALTER TABLE statement as one
    const lines = migrationSQL
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("--"));

    const alterStatement = lines
      .filter((line) => line.includes("ALTER") || line.includes("ADD COLUMN"))
      .join("\n");

    const commentStatements = lines.filter((line) => line.includes("COMMENT"));

    // Execute ALTER statement
    if (alterStatement) {
      console.log("Executing ALTER TABLE statement...");
      await db.execute(sql.raw(alterStatement));
      console.log("✓ Columns added successfully");
    }

    // Execute COMMENT statements
    for (const statement of commentStatements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        await db.execute(sql.raw(statement));
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

runMigration();
