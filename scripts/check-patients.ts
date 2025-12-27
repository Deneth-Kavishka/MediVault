import "dotenv/config";
import { db } from "../server/db";
import { patients, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkPatients() {
  try {
    console.log("🔍 Fetching all patients...\n");

    const allPatients = await db
      .select({
        id: patients.id,
        userId: patients.userId,
        nic: patients.nic,
        healthId: patients.healthId,
        rfid: patients.rfid,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id));

    if (allPatients.length === 0) {
      console.log("❌ No patients found in the database");
      return;
    }

    console.log(`✅ Found ${allPatients.length} patient(s):\n`);

    allPatients.forEach((p, index) => {
      console.log(`Patient ${index + 1}:`);
      console.log(`  UUID ID: ${p.id}`);
      console.log(`  User ID: ${p.userId}`);
      console.log(`  Name: ${p.firstName} ${p.lastName}`);
      console.log(`  Email: ${p.email}`);
      console.log(`  NIC: ${p.nic}`);
      console.log(`  Health ID: ${p.healthId}`);
      console.log(`  RFID: ${p.rfid}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkPatients();
