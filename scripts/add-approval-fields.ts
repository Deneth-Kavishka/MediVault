// Migration script to add approval fields to appointments table
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addApprovalFields() {
  try {
    console.log("Adding approval fields to appointments table...");

    // Add the appointmentTime column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS appointment_time VARCHAR;
    `);

    // Add the approvedAt column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    `);

    // Add the approvedBy column
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR;
    `);

    console.log("✅ Successfully added approval fields");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addApprovalFields();
