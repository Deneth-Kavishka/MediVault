// Migration script to add cancelledAt column to appointments table
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addCancelledAtColumn() {
  try {
    console.log("Adding cancelledAt column to appointments table...");

    // Add the cancelledAt column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
    `);

    console.log("✅ Successfully added cancelledAt column");

    // Update existing cancelled appointments to set cancelledAt to updatedAt
    const result = await db.execute(sql`
      UPDATE appointments 
      SET cancelled_at = updated_at 
      WHERE status = 'cancelled' AND cancelled_at IS NULL;
    `);

    console.log(
      `✅ Updated ${result.rowCount || 0} existing cancelled appointments`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addCancelledAtColumn();
