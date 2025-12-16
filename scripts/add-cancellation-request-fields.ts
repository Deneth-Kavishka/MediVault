// Migration script to add cancellation request fields to appointments table
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addCancellationFields() {
  try {
    console.log("Adding cancellation request fields to appointments table...");

    // Add the cancellationReason column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    `);

    // Add the cancellationRequestedBy column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancellation_requested_by VARCHAR;
    `);

    // Add the cancellationRequestedAt column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP;
    `);

    console.log("✅ Successfully added cancellation request fields");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addCancellationFields();
