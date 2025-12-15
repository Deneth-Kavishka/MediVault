// Quick check to see what users are in the database
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function checkUsers() {
  try {
    console.log("🔍 Checking users in database...\n");

    const allUsers = await db.select().from(users);

    console.log(`Total users: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log(
        "❌ No users found! Run 'npm run seed' to populate the database.\n"
      );
    } else {
      console.log("Users in database:");
      console.log("=====================================");
      allUsers.forEach((user) => {
        console.log(`- ${user.fullName || user.username} (${user.email})`);
        console.log(`  Role: ${user.role}`);
        console.log(`  ID: ${user.id}`);
        console.log("-------------------------------------");
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUsers();
