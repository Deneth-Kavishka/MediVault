// Run with: node run-patient-registration-migration.js
// Uses DATABASE_URL if set, otherwise falls back to local dev URL.

import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://medivault:Alpha@localhost:5432/medivault";

const sqlFiles = [
  "migration_add_patient_registration_requests.sql",
  "migration_add_patient_registration_request_medical_fields.sql",
].map((f) => join(process.cwd(), f));

async function run() {
  console.log("🔄 Running patient registration migration...");
  console.log(
    "📍 Using DATABASE_URL:",
    DATABASE_URL?.replace(/:[^:]*@/, ":****@")
  );

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    for (const filePath of sqlFiles) {
      const sql = readFileSync(filePath, "utf-8");
      await pool.query(sql);
      console.log("✅ Applied:", filePath);
    }
    console.log("✅ All migrations applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:");
    console.error(err?.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
