const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully!");

    // Get database name from connection
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📂 Database Name: ${dbName}`);

    // List all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(`\n📊 Total Collections: ${collections.length}`);

    if (collections.length > 0) {
      console.log("\n📋 Collections found:");
      for (const collection of collections) {
        const count = await mongoose.connection.db
          .collection(collection.name)
          .countDocuments();
        console.log(`   ✅ ${collection.name} (${count} documents)`);
      }
    } else {
      console.log("\n⚠️  No collections found. Database is empty.");
      console.log(
        "💡 To create collections, try registering a user or creating data through the API."
      );
    }

    // Check if our models are properly registered
    console.log("\n🏗️  Mongoose Models Registered:");
    const modelNames = mongoose.modelNames();
    if (modelNames.length > 0) {
      modelNames.forEach((model) => {
        console.log(`   ✅ ${model}`);
      });
    } else {
      console.log("   ⚠️  No models registered yet");
    }

    // Test connection health
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    console.log(`\n🚀 MongoDB Server Status:`);
    console.log(`   Version: ${serverStatus.version}`);
    console.log(`   Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    console.log(`   Connections: ${serverStatus.connections.current}`);
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the check
checkDatabase();
