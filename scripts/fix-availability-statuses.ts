// Quick fix script to update existing doctor availability records
// This ensures all records have correct status values based on is_active field

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db.js";

async function fixStatuses() {
  try {
    console.log("🔧 Fixing doctor availability statuses...");

    // Update statuses based on is_active field
    const result1 = await db.execute(sql`
      UPDATE doctor_availability 
      SET status = CASE 
          WHEN is_active = true THEN 'active'
          WHEN is_active = false THEN 'inactive'
          ELSE 'active'
      END
      WHERE status = 'active' OR status = 'inactive' OR status IS NULL
    `);

    console.log(
      `✅ Updated ${result1.rowCount || 0} records to match is_active state`
    );

    // Update past availabilities to finished
    const result2 = await db.execute(sql`
      UPDATE doctor_availability 
      SET status = 'finished'
      WHERE available_date < CURRENT_DATE 
        AND status NOT IN ('deleted', 'finished')
    `);

    console.log(
      `✅ Updated ${result2.rowCount || 0} past records to 'finished' status`
    );

    // Show current status distribution
    const stats = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM doctor_availability
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log("\n📊 Current status distribution:");
    stats.rows.forEach((row: any) => {
      console.log(`   ${row.status || "NULL"}: ${row.count}`);
    });

    console.log("\n✨ Status fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing statuses:", error);
    process.exit(1);
  }
}

fixStatuses();
