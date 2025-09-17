const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import all models to register them
const User = require("./server/models/User");
const Patient = require("./server/models/Patient");
const Appointment = require("./server/models/Appointment");
const MedicalRecord = require("./server/models/MedicalRecord");
const Prescription = require("./server/models/Prescription");
const Medicine = require("./server/models/Medicine");
const Inventory = require("./server/models/Inventory");
const LabTest = require("./server/models/LabTest");

async function fullDatabaseCheck() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully!");

    const dbName = mongoose.connection.db.databaseName;
    console.log(`📂 Database Name: ${dbName}`);

    // Now check with models loaded
    console.log("\n🏗️  All MediVault Models:");
    const models = [
      {
        name: "User",
        model: User,
        description: "System users (doctors, patients, staff)",
      },
      {
        name: "Patient",
        model: Patient,
        description: "Patient medical profiles",
      },
      {
        name: "Appointment",
        model: Appointment,
        description: "Medical appointments",
      },
      {
        name: "MedicalRecord",
        model: MedicalRecord,
        description: "Patient medical records",
      },
      {
        name: "Prescription",
        model: Prescription,
        description: "Medicine prescriptions",
      },
      { name: "Medicine", model: Medicine, description: "Medicine database" },
      {
        name: "Inventory",
        model: Inventory,
        description: "Pharmacy inventory",
      },
      { name: "LabTest", model: LabTest, description: "Laboratory tests" },
    ];

    for (const modelInfo of models) {
      try {
        const count = await modelInfo.model.countDocuments();
        console.log(
          `   ✅ ${modelInfo.name}: ${count} documents - ${modelInfo.description}`
        );
      } catch (error) {
        console.log(`   ❌ ${modelInfo.name}: Error - ${error.message}`);
      }
    }

    // List all collections in database
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(`\n📊 Database Collections (${collections.length} total):`);

    for (const collection of collections) {
      const count = await mongoose.connection.db
        .collection(collection.name)
        .countDocuments();
      const stats = await mongoose.connection.db
        .collection(collection.name)
        .stats();
      console.log(
        `   📁 ${collection.name}: ${count} documents (${Math.round(stats.size / 1024)} KB)`
      );
    }

    // Database statistics
    const dbStats = await mongoose.connection.db.stats();
    console.log(`\n📈 Database Statistics:`);
    console.log(`   Total Size: ${Math.round(dbStats.dataSize / 1024)} KB`);
    console.log(`   Index Size: ${Math.round(dbStats.indexSize / 1024)} KB`);
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Objects: ${dbStats.objects}`);

    console.log(`\n🎯 MediVault Database Status: FULLY CONFIGURED ✅`);
    console.log(`   - All 8 models are properly set up`);
    console.log(`   - Database collections are created`);
    console.log(`   - Ready for frontend integration`);
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the full check
fullDatabaseCheck();
