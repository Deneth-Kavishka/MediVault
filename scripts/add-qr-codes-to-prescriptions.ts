import { db } from "../server/db";
import { prescriptions } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

async function addQrCodesToPrescriptions() {
  try {
    console.log("Starting QR code generation for existing prescriptions...");

    // Get all prescriptions without QR codes
    const prescriptionsWithoutQR = await db
      .select()
      .from(prescriptions)
      .where(isNull(prescriptions.qrCode));

    console.log(
      `Found ${prescriptionsWithoutQR.length} prescriptions without QR codes`
    );

    let updated = 0;
    for (const prescription of prescriptionsWithoutQR) {
      // Generate unique QR code using prescription ID and timestamp
      const qrCode = `RX-${prescription.id
        .substring(0, 8)
        .toUpperCase()}-${Date.now()}`;

      await db
        .update(prescriptions)
        .set({
          qrCode,
          updatedAt: new Date(),
        })
        .where(eq(prescriptions.id, prescription.id));

      updated++;
      console.log(
        `✓ Updated prescription ${prescription.id} with QR code: ${qrCode}`
      );
    }

    console.log(`\n✅ Successfully added QR codes to ${updated} prescriptions`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding QR codes:", error);
    process.exit(1);
  }
}

addQrCodesToPrescriptions();
