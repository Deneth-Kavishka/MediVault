import { db } from "../server/db";
import { prescriptions } from "@shared/schema";

async function verifyPrescriptionIds() {
  try {
    const allPrescriptions = await db
      .select({
        id: prescriptions.id,
        createdAt: prescriptions.createdAt,
        qrCode: prescriptions.qrCode,
      })
      .from(prescriptions)
      .orderBy(prescriptions.createdAt);

    console.log("\n✅ Current Prescriptions in Database:");
    console.log("━".repeat(80));

    allPrescriptions.forEach((p, index) => {
      console.log(`\n${index + 1}. ID: ${p.id}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   QR Code: ${p.qrCode || "Not set"}`);
    });

    console.log("\n" + "━".repeat(80));
    console.log(`\nTotal: ${allPrescriptions.length} prescriptions`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyPrescriptionIds();
