// Admin Features Verification Script
// Run this after starting the dev server to verify admin endpoints

async function verifyAdminFeatures() {
  console.log("🔍 Verifying Admin Features...\n");

  const tests = {
    stats: {
      endpoint: "/api/admin/stats",
      method: "GET",
      description: "System Statistics",
    },
    users: {
      endpoint: "/api/admin/users",
      method: "GET",
      description: "All Users List",
    },
    usersByRole: {
      endpoint: "/api/admin/users?role=admin",
      method: "GET",
      description: "Users by Role (admin)",
    },
  };

  for (const [key, test] of Object.entries(tests)) {
    try {
      console.log(`Testing: ${test.description}`);
      console.log(`  ${test.method} ${test.endpoint}`);

      const response = await fetch(test.endpoint, {
        method: test.method,
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Success (${response.status})`);

        // Log sample data
        if (key === "stats") {
          console.log(`     Total Users: ${data.totalUsers}`);
          console.log(`     Active Patients: ${data.activePatients}`);
          console.log(`     Total Appointments: ${data.totalAppointments}`);
        } else if (key === "users" || key === "usersByRole") {
          console.log(`     Found ${data.length} users`);
          if (data.length > 0) {
            console.log(`     Sample: ${data[0].username} (${data[0].role})`);
          }
        }
      } else {
        console.log(`  ❌ Failed (${response.status} ${response.statusText})`);
        const error = await response.json().catch(() => ({}));
        console.log(`     Error: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log("");
  }

  console.log("✅ Verification Complete!\n");
  console.log("📝 Next Steps:");
  console.log("   1. Login as admin user");
  console.log("   2. Navigate to Dashboard - verify stats show real data");
  console.log("   3. Click 'User Management' in sidebar");
  console.log("   4. Test search and filter functionality");
  console.log("   5. Try editing a user");
  console.log("   6. Test delete confirmation dialog\n");
}

// Run verification
console.log(
  "⚠️  Note: You must be logged in as an admin user for these tests to pass\n"
);
console.log("Run this in browser console after logging in:\n");
console.log("  1. Open DevTools (F12)");
console.log("  2. Go to Console tab");
console.log("  3. Paste and run verifyAdminFeatures()");
console.log("\n" + "=".repeat(60) + "\n");

verifyAdminFeatures();
