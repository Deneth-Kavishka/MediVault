import { db } from "../server/db";
import { chatMessages, users } from "@shared/schema";
import { desc } from "drizzle-orm";

async function checkMessages() {
  try {
    console.log("🔍 Checking chat messages in database...\n");

    // Get all messages
    const messages = await db
      .select({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        message: chatMessages.message,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    if (messages.length === 0) {
      console.log("❌ No messages found in database!");
      return;
    }

    console.log(`✅ Found ${messages.length} messages:\n`);

    // Get user details for senders and receivers
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    for (const msg of messages) {
      const sender = userMap.get(msg.senderId);
      const receiver = userMap.get(msg.receiverId);

      console.log(`📨 Message ID: ${msg.id.substring(0, 8)}...`);
      console.log(
        `   From: ${sender?.fullName || sender?.username || msg.senderId}`
      );
      console.log(
        `   To: ${receiver?.fullName || receiver?.username || msg.receiverId}`
      );
      console.log(`   Text: "${msg.message}"`);
      console.log(`   Read: ${msg.isRead ? "✅" : "❌"}`);
      console.log(`   Time: ${msg.createdAt}`);
      console.log("");
    }

    console.log(`\n📊 Total messages in database: ${messages.length}`);
  } catch (error) {
    console.error("❌ Error checking messages:", error);
  } finally {
    process.exit(0);
  }
}

checkMessages();
