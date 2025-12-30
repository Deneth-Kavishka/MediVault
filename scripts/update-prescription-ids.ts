import { db } from "../server/db";
import { prescriptions, prescriptionItems } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updatePrescriptionIds() {
  try {
    console.log("Starting prescription ID format update...");

    // Get all prescriptions
    const allPrescriptions = await db
      .select()
      .from(prescriptions)
      .orderBy(prescriptions.createdAt);

    console.log(`Found ${allPrescriptions.length} prescriptions to update`);

    let updated = 0;
    const dailyCounters: Record<string, number> = {};

    for (const prescription of allPrescriptions) {
      const createdDate = new Date(prescription.createdAt!);
      const day = String(createdDate.getDate()).padStart(2, "0");
      const month = String(createdDate.getMonth() + 1).padStart(2, "0");
      const year = String(createdDate.getFullYear()).slice(-2);
      const dateKey = `${day}/${month}/${year}`;

      // Increment counter for this date
      dailyCounters[dateKey] = (dailyCounters[dateKey] || 0) + 1;
      const sequence = String(dailyCounters[dateKey]).padStart(3, "0");

      const newId = `MV-PRES-${dateKey}-${sequence}`;
      const oldId = prescription.id;

      console.log(`Updating ${oldId} → ${newId}`);

      // Use a transaction to safely update both tables
      await db.transaction(async (tx) => {
        // Step 1: Create new prescription with new ID
        await tx.insert(prescriptions).values({
          ...prescription,
          id: newId,
        });

        // Step 2: Update prescription items to reference new ID
        await tx
          .update(prescriptionItems)
          .set({ prescriptionId: newId })
          .where(eq(prescriptionItems.prescriptionId, oldId));

        // Step 3: Delete old prescription
        await tx.delete(prescriptions).where(eq(prescriptions.id, oldId));
      });

      updated++;
      console.log(
        `✓ Updated prescription ${updated}/${allPrescriptions.length}`
      );
    }

    console.log(
      `\n✅ Successfully updated ${updated} prescription IDs to new format`
    );
    console.log("\nNew format: MV-PRES-DD/MM/YY-XXX");
    console.log("Example: MV-PRES-29/12/25-001");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating prescription IDs:", error);
    process.exit(1);
  }
}

updatePrescriptionIds();
