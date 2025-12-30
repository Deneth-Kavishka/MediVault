// Add sample lab tests for Methmini Himasha ordered by Dr. Nimal Fernando
import "dotenv/config";
import { db } from "../server/db";
import { users, patients, doctors, labTests } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function addSampleLabTests() {
  console.log("🧪 Adding sample lab tests...\n");

  try {
    // Find patient Methmini Himasha
    const patientUsers = await db
      .select()
      .from(users)
      .where(
        and(eq(users.firstName, "Methmini"), eq(users.lastName, "Himasha"))
      );

    if (patientUsers.length === 0) {
      console.log("❌ Patient 'Methmini Himasha' not found in database.");
      console.log("Looking for similar names...\n");

      const allPatients = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.role, "patient"));

      console.log("Available patients:");
      allPatients.forEach((p) => {
        console.log(`- ${p.firstName} ${p.lastName} (${p.email})`);
      });
      process.exit(1);
    }

    const patientUser = patientUsers[0];
    console.log(
      `✅ Found patient: ${patientUser.firstName} ${patientUser.lastName}`
    );

    // Get patient record
    const [patientRecord] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, patientUser.id));

    if (!patientRecord) {
      console.log("❌ Patient record not found");
      process.exit(1);
    }

    console.log(
      `✅ Patient ID: ${patientRecord.id}, Health ID: ${patientRecord.healthId}`
    );

    // Find doctor Nimal Fernando
    const doctorUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.firstName, "Nimal"), eq(users.lastName, "Fernando")));

    if (doctorUsers.length === 0) {
      console.log("❌ Doctor 'Nimal Fernando' not found in database.");
      console.log("Looking for similar names...\n");

      const allDoctors = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.role, "doctor"));

      console.log("Available doctors:");
      allDoctors.forEach((d) => {
        console.log(`- ${d.firstName} ${d.lastName} (${d.email})`);
      });
      process.exit(1);
    }

    const doctorUser = doctorUsers[0];
    console.log(
      `✅ Found doctor: ${doctorUser.firstName} ${doctorUser.lastName}`
    );

    // Get doctor record
    const [doctorRecord] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, doctorUser.id));

    if (!doctorRecord) {
      console.log("❌ Doctor record not found");
      process.exit(1);
    }

    console.log(`✅ Doctor ID: ${doctorRecord.id}\n`);

    // Create sample lab tests
    const sampleTests = [
      {
        patientId: patientRecord.id,
        doctorId: doctorRecord.id,
        testType: "Blood Test",
        testName: "Complete Blood Count (CBC)",
        status: "pending" as const,
        urgency: "normal" as const,
        requestDate: new Date(),
        notes: "Routine checkup - checking for anemia and infection markers",
      },
      {
        patientId: patientRecord.id,
        doctorId: doctorRecord.id,
        testType: "Blood Test",
        testName: "Lipid Profile",
        status: "pending" as const,
        urgency: "normal" as const,
        requestDate: new Date(),
        notes:
          "Cholesterol screening - patient reports family history of heart disease",
      },
      {
        patientId: patientRecord.id,
        doctorId: doctorRecord.id,
        testType: "Blood Test",
        testName: "Fasting Blood Glucose",
        status: "pending" as const,
        urgency: "high" as const,
        requestDate: new Date(),
        notes:
          "Diabetes screening - patient experiencing increased thirst and fatigue",
      },
      {
        patientId: patientRecord.id,
        doctorId: doctorRecord.id,
        testType: "Urine Test",
        testName: "Urinalysis - Complete",
        status: "pending" as const,
        urgency: "normal" as const,
        requestDate: new Date(),
        notes: "Kidney function assessment",
      },
      {
        patientId: patientRecord.id,
        doctorId: doctorRecord.id,
        testType: "Blood Test",
        testName: "Thyroid Function Test (TSH, T3, T4)",
        status: "pending" as const,
        urgency: "normal" as const,
        requestDate: new Date(),
        notes: "Patient reports unexplained weight changes and fatigue",
      },
    ];

    console.log("Creating lab tests...");
    const createdTests = await db
      .insert(labTests)
      .values(sampleTests)
      .returning();

    console.log(
      `\n✅ Successfully created ${createdTests.length} lab tests:\n`
    );
    createdTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.testName}`);
      console.log(`   Type: ${test.testType}`);
      console.log(`   Status: ${test.status}`);
      console.log(`   Urgency: ${test.urgency}`);
      console.log(`   Notes: ${test.notes}`);
      console.log("");
    });

    console.log("✅ Sample lab tests added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addSampleLabTests();
