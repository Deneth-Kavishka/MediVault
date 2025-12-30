import { db } from "../server/db";
import { prescriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateQrCodes() {
  try {
    console.log("Starting QR code update to match new prescription IDs...");

    const allPrescriptions = await db
      .select()
      .from(prescriptions)
      .orderBy(prescriptions.createdAt);

    console.log(`Found ${allPrescriptions.length} prescriptions to update`);

    let updated = 0;

    for (const prescription of allPrescriptions) {
      const newQrCode = `RX-${prescription.id}-${Date.now()}`;

      console.log(`Updating QR: ${prescription.id}`);
      console.log(`  Old: ${prescription.qrCode}`);
      console.log(`  New: ${newQrCode}`);

      await db
        .update(prescriptions)
        .set({ qrCode: newQrCode })
        .where(eq(prescriptions.id, prescription.id));

      updated++;
      console.log(`✓ Updated ${updated}/${allPrescriptions.length}`);
    }

    console.log(`\n✅ Successfully updated ${updated} QR codes`);
    console.log("\nNew QR format: RX-MV-PRES-DD/MM/YY-XXX-timestamp");
    console.log("Example: RX-MV-PRES-29/12/25-001-1735489234567");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating QR codes:", error);
    process.exit(1);
  }
}

updateQrCodes();
