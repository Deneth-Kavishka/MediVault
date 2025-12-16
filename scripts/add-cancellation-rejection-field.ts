// Migration script to add cancellation rejection reason field
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addCancellationRejectionField() {
  try {
    console.log(
      "Adding cancellation rejection reason field to appointments table..."
    );

    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancellation_rejected_reason TEXT;
    `);

    console.log("✅ Successfully added cancellation rejection reason field");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addCancellationRejectionField();
