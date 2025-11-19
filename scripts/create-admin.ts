// Create initial admin user for MediVault
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  try {
    console.log("🔍 Checking for existing admin user...");

    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists!");
      console.log("   Username: admin");
      console.log("   Email:", existingAdmin[0].email);
      console.log("   Role:", existingAdmin[0].role);
      process.exit(0);
    }

    console.log("📝 Creating admin user...");

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin user
    const newAdmin = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@medivault.local",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      })
      .returning();

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Admin Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   Email:", newAdmin[0].email);
    console.log("   Role:", newAdmin[0].role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
