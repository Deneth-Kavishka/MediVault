// Check and fix database schema - Run with: node fix-schema.js
import pg from "pg";

const { Pool } = pg;

// Use the DATABASE_URL from your .env file
const DATABASE_URL = "postgresql://medivault:Alpha@localhost:5432/medivault";

const pool = new Pool({ connectionString: DATABASE_URL });

async function fixSchema() {
  console.log("🔍 Checking database schema...");

  try {
    // Check what columns exist
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'doctor_availability'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Current columns in doctor_availability table:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check if we need to rename or add columns
    const columnNames = result.rows.map((r) => r.column_name);

    if (
      columnNames.includes("day_of_week") &&
      !columnNames.includes("available_date")
    ) {
      console.log(
        "\n🔄 Found old schema with day_of_week, needs migration to available_date..."
      );

      await pool.query(`
        ALTER TABLE doctor_availability 
        DROP COLUMN IF EXISTS day_of_week;
      `);
      console.log("✅ Removed day_of_week column");

      await pool.query(`
        ALTER TABLE doctor_availability 
        ADD COLUMN IF NOT EXISTS available_date TIMESTAMP NOT NULL DEFAULT NOW();
      `);
      console.log("✅ Added available_date column");
    }

    if (!columnNames.includes("available_date")) {
      console.log("\n🔄 Adding available_date column...");
      await pool.query(`
        ALTER TABLE doctor_availability 
        ADD COLUMN available_date TIMESTAMP NOT NULL DEFAULT NOW();
      `);
      console.log("✅ Added available_date column");
    }

    if (!columnNames.includes("place_id")) {
      console.log("\n🔄 Adding place_id column...");
      await pool.query(`
        ALTER TABLE doctor_availability 
        ADD COLUMN place_id VARCHAR;
      `);
      console.log("✅ Added place_id column");
    }

    // Show final schema
    const finalResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'doctor_availability'
      ORDER BY ordinal_position;
    `);

    console.log("\n✅ Final schema:");
    finalResult.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    console.log("\n🎉 Schema is now correct!");
    console.log("✅ Restart your server and try adding availability again.");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

fixSchema();
