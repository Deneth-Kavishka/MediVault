import "dotenv/config";
import { db } from "../server/db";
import { appointments, medicalRecords } from "../shared/schema";
import { and, eq } from "drizzle-orm";

async function main() {
  const completed = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      reason: appointments.reason,
      completionNotes: appointments.completionNotes,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.status, "completed"));

  let created = 0;
  let skipped = 0;

  for (const apt of completed) {
    const existing = await db
      .select({ id: medicalRecords.id })
      .from(medicalRecords)
      .where(eq(medicalRecords.appointmentId, apt.id))
      .limit(1);

    if (existing[0]) {
      skipped++;
      continue;
    }

    const diagnosisFromReason = String(apt.reason || "")
      .trim()
      .slice(0, 500);
    const diagnosis = diagnosisFromReason || "Consultation";

    await db.insert(medicalRecords).values({
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      appointmentId: apt.id,
      diagnosis,
      symptoms: null,
      notes:
        typeof apt.completionNotes === "string" &&
        apt.completionNotes.trim().length
          ? apt.completionNotes.trim()
          : null,
      vitalSigns: null,
    });

    created++;
  }

  console.log(
    `Backfill complete. completed_appointments=${completed.length} created_medical_records=${created} skipped_existing=${skipped}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
