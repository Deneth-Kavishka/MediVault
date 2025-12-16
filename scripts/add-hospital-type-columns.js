import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addColumns() {
  const client = await pool.connect();

  try {
    console.log("Adding hospital type and appointment tracking columns...");

    // Add booked_count column
    await client.query(`
      ALTER TABLE doctor_availability 
      ADD COLUMN IF NOT EXISTS booked_count INTEGER NOT NULL DEFAULT 0;
    `);
    console.log("✓ Added booked_count column");

    // Add hospital_type column
    await client.query(`
      ALTER TABLE doctor_availability 
      ADD COLUMN IF NOT EXISTS hospital_type VARCHAR NOT NULL DEFAULT 'government';
    `);
    console.log("✓ Added hospital_type column");

    // Add consultation_fee column
    await client.query(`
      ALTER TABLE doctor_availability 
      ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 0.00;
    `);
    console.log("✓ Added consultation_fee column");

    // Verify columns were added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'doctor_availability'
      AND column_name IN ('booked_count', 'hospital_type', 'consultation_fee')
      ORDER BY column_name;
    `);

    console.log("\nVerification - New columns:");
    result.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`
      );
    });

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns().catch(console.error);
