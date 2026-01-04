import "dotenv/config";
import { db } from "../server/db";
import {
  appointments,
  medicalRecords,
  patients,
  users,
} from "../shared/schema";
import { and, eq, sql } from "drizzle-orm";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      "Usage: tsx scripts/check-medical-records-for-user.ts <email>"
    );
    process.exit(1);
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = userRows[0];
  if (!user?.id) {
    console.error("No user found for email:", email);
    process.exit(2);
  }

  const patientRows = await db
    .select({
      id: patients.id,
      userId: patients.userId,
      nic: patients.nic,
      healthId: patients.healthId,
    })
    .from(patients)
    .where(eq(patients.userId, user.id))
    .limit(1);

  const patient = patientRows[0];
  console.log("User:", user);
  console.log("Patient:", patient || null);

  const total = await db
    .select({ c: sql<number>`count(*)` })
    .from(medicalRecords);

  console.log("total_medical_records:", total[0]?.c ?? 0);

  if (patient?.id) {
    const apptTotal = await db
      .select({ c: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.patientId, patient.id));

    const apptCompleted = await db
      .select({ c: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patient.id),
          eq(appointments.status, "completed")
        )
      );

    console.log("appointments_for_patientId:", apptTotal[0]?.c ?? 0);
    console.log(
      "completed_appointments_for_patientId:",
      apptCompleted[0]?.c ?? 0
    );

    const mine = await db
      .select({ c: sql<number>`count(*)` })
      .from(medicalRecords)
      .where(eq(medicalRecords.patientId, patient.id));

    console.log("medical_records_for_patientId:", mine[0]?.c ?? 0);

    const sample = await db
      .select({
        id: medicalRecords.id,
        patientId: medicalRecords.patientId,
        doctorId: medicalRecords.doctorId,
        appointmentId: medicalRecords.appointmentId,
        diagnosis: medicalRecords.diagnosis,
        createdAt: medicalRecords.createdAt,
      })
      .from(medicalRecords)
      .where(eq(medicalRecords.patientId, patient.id))
      .limit(5);

    console.log("sample_records_for_patientId:", sample);
  }

  // Sanity check: do any medical records accidentally reference the userId instead of patientId?
  const byUserId = await db
    .select({ c: sql<number>`count(*)` })
    .from(medicalRecords)
    .where(eq(medicalRecords.patientId, user.id));

  console.log(
    "medical_records_where_patientId_equals_userId:",
    byUserId[0]?.c ?? 0
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => {
    process.exit(0);
  });