// Debug script to check what's in the database
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db.js";

async function checkData() {
  try {
    console.log("🔍 Checking doctor_availability table...\n");

    // Get all records with details
    const result = await db.execute(sql`
      SELECT 
        id,
        doctor_id,
        location_name,
        location_city,
        available_date,
        start_time,
        end_time,
        is_active,
        status,
        created_at
      FROM doctor_availability
      ORDER BY created_at DESC
    `);

    console.log(`📊 Found ${result.rowCount} records:\n`);

    result.rows.forEach((row: any, index: number) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Location: ${row.location_name}`);
      console.log(`  City: ${row.location_city}`);
      console.log(`  Date: ${row.available_date}`);
      console.log(`  Time: ${row.start_time} - ${row.end_time}`);
      console.log(`  Is Active: ${row.is_active}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Created: ${row.created_at}`);
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkData();
