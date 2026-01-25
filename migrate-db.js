// Quick migration script - Run with: node migrate-db.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env");
}

function shouldUseSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(shouldUseSsl(DATABASE_URL) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
});

async function migrate() {
  console.log("🔄 Running migration...");
  console.log(
    "📍 Using DATABASE_URL:",
    DATABASE_URL?.replace(/:[^:]*@/, ":****@")
  );

  try {
    // Add place_id column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'doctor_availability' 
          AND column_name = 'place_id'
        ) THEN
          ALTER TABLE doctor_availability ADD COLUMN place_id VARCHAR;
          RAISE NOTICE 'Added place_id column';
        ELSE
          RAISE NOTICE 'place_id column already exists';
        END IF;
      END $$;
    `);

    console.log("✅ Migration completed successfully!");
    console.log(
      "✅ You can now restart the server and try adding availability again."
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\n💡 Make sure:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. DATABASE_URL is correct");
    console.error("   3. You have permission to alter the table");
  } finally {
    await pool.end();
  }
}

migrate();
