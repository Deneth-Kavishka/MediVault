import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "medivault",
  user: "medivault",
  password: "Alpha",
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔄 Starting availability status migration...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "migration_add_availability_status.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Execute the migration
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("✅ Migration completed successfully!");

    // Verify the changes
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'finished') as finished
      FROM doctor_availability
    `);

    console.log("\n📊 Status distribution:");
    console.log("  Total:", result.rows[0].total);
    console.log("  Active:", result.rows[0].active);
    console.log("  Inactive:", result.rows[0].inactive);
    console.log("  Finished:", result.rows[0].finished);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
