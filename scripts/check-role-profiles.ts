import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../server/db.js";
import {
  doctors,
  labTechnicians,
  patients,
  pharmacists,
  users,
} from "../shared/schema.js";

async function checkRoleProfiles() {
  try {
    console.log("Checking for users missing role-specific profile rows...");

    const missingPatients = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .leftJoin(patients, eq(users.id, patients.userId))
      .where(and(eq(users.role, "patient"), isNull(patients.id)));

    const missingDoctors = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .leftJoin(doctors, eq(users.id, doctors.userId))
      .where(and(eq(users.role, "doctor"), isNull(doctors.id)));

    const missingPharmacists = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .leftJoin(pharmacists, eq(users.id, pharmacists.userId))
      .where(and(eq(users.role, "pharmacist"), isNull(pharmacists.id)));

    const missingLabTechs = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .leftJoin(labTechnicians, eq(users.id, labTechnicians.userId))
      .where(and(eq(users.role, "lab_technician"), isNull(labTechnicians.id)));

    const print = (
      label: string,
      rows: Array<{ id: string; username: string }>
    ) => {
      console.log(`\n${label}: ${rows.length}`);
      for (const r of rows.slice(0, 25)) {
        console.log(`  - ${r.username} (${r.id})`);
      }
      if (rows.length > 25) {
        console.log(`  ...and ${rows.length - 25} more`);
      }
    };

    print("Patients missing patients row", missingPatients);
    print("Doctors missing doctors row", missingDoctors);
    print("Pharmacists missing pharmacists row", missingPharmacists);
    print("Lab techs missing lab_technicians row", missingLabTechs);

    console.log("\n✅ Done.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
}

checkRoleProfiles();
