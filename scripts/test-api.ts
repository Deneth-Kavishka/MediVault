// Test the /api/users/available endpoint
import "dotenv/config";

async function testEndpoint() {
  try {
    const PORT = process.env.PORT || 5000;
    const url = `http://localhost:${PORT}/api/users/available`;

    console.log(`🧪 Testing endpoint: ${url}\n`);
    console.log(
      "⚠️  Note: This will fail if you're not logged in (needs session cookie)\n"
    );
    console.log("To test properly:");
    console.log("1. Login to the app in your browser");
    console.log("2. Open browser DevTools → Network tab");
    console.log("3. Navigate to Messages page");
    console.log("4. Click 'New Message' button");
    console.log("5. Check the network request to /api/users/available\n");

    // Try to call without auth (will fail as expected)
    const response = await fetch(url);

    if (response.status === 401) {
      console.log("✅ Endpoint exists (returns 401 Unauthorized as expected)");
      console.log(
        "   This means the endpoint is working, but requires authentication.\n"
      );
    } else {
      const data = await response.json();
      console.log("📊 Response:", data);
    }
  } catch (error: any) {
    if (error.cause?.code === "ECONNREFUSED") {
      console.error("❌ Server is not running!");
      console.log("\n💡 Start the server with: npm run dev\n");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

testEndpoint();
