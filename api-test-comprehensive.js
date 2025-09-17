const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const API_URL = `${BASE_URL}/api`;

// Store tokens and IDs for testing
let tokens = {};
let testIds = {};

// Test data with proper structure
const testUsers = {
  doctor: {
    firstName: "Dr. John",
    lastName: "Smith",
    email: "doctor@medivault.com",
    password: "Password123!",
    confirmPassword: "Password123!",
    nic: "198012345678",
    phone: "+94771234567",
    dateOfBirth: "1980-01-15",
    gender: "Male",
    address: {
      street: "123 Medical Street",
      city: "Colombo",
      district: "Colombo",
      province: "Western",
      postalCode: "00300",
    },
    role: "Doctor",
    emergencyContact: {
      name: "Jane Smith",
      relationship: "Spouse",
      phone: "+94771234568",
    },
  },
  patient: {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "patient@medivault.com",
    password: "Password123!",
    confirmPassword: "Password123!",
    nic: "199512345679",
    phone: "+94777654321",
    dateOfBirth: "1995-05-20",
    gender: "Female",
    address: {
      street: "456 Patient Avenue",
      city: "Kandy",
      district: "Kandy",
      province: "Central",
      postalCode: "20000",
    },
    role: "Patient",
    emergencyContact: {
      name: "Mike Johnson",
      relationship: "Father",
      phone: "+94777654322",
    },
    bloodType: "A+",
    height: 165,
    weight: 58,
  },
};

// Helper function to make API calls with better error handling
async function makeRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: "Server not running. Please start the server first.",
        status: null,
      };
    }

    return {
      success: false,
      error: error.response?.data || { message: error.message },
      status: error.response?.status,
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log("\n🏥 Testing Health Check...");
  const result = await makeRequest("GET", `${BASE_URL}/health`);

  if (result.success) {
    console.log("✅ Health check passed");
    console.log(`   Server: ${result.data.message}`);
    console.log(`   Version: ${result.data.version}`);
  } else {
    console.log("❌ Health check failed:", result.error);
  }

  return result.success;
}

async function testAPIInfo() {
  console.log("\n📋 Testing API Information...");
  const result = await makeRequest("GET", API_URL);

  if (result.success) {
    console.log("✅ API info retrieved");
    console.log(
      `   Endpoints available: ${Object.keys(result.data.endpoints || {}).length}`
    );
  } else {
    console.log("❌ API info failed:", result.error);
  }

  return result.success;
}

async function testUserRegistration() {
  console.log("\n👥 Testing User Registration...");

  // Register doctor
  console.log("   Registering doctor...");
  const doctorResult = await makeRequest(
    "POST",
    `${API_URL}/auth/register`,
    testUsers.doctor
  );

  if (doctorResult.success) {
    console.log("   ✅ Doctor registered successfully");
    testIds.doctorId = doctorResult.data.data?.user?.id;
  } else {
    console.log(
      "   ❌ Doctor registration failed:",
      doctorResult.error?.message || "Unknown error"
    );
    if (doctorResult.error && typeof doctorResult.error === "object") {
      console.log(
        "   Error details:",
        JSON.stringify(doctorResult.error, null, 2)
      );
    }
  }

  // Register patient
  console.log("   Registering patient...");
  const patientResult = await makeRequest(
    "POST",
    `${API_URL}/auth/register`,
    testUsers.patient
  );

  if (patientResult.success) {
    console.log("   ✅ Patient registered successfully");
    testIds.patientId = patientResult.data.data?.user?.id;
  } else {
    console.log(
      "   ❌ Patient registration failed:",
      patientResult.error?.message || "Unknown error"
    );
    if (patientResult.error && typeof patientResult.error === "object") {
      console.log(
        "   Error details:",
        JSON.stringify(patientResult.error, null, 2)
      );
    }
  }

  return doctorResult.success && patientResult.success;
}

async function testUserLogin() {
  console.log("\n🔐 Testing User Login...");

  // Login doctor
  console.log("   Logging in doctor...");
  const doctorLogin = await makeRequest("POST", `${API_URL}/auth/login`, {
    email: testUsers.doctor.email,
    password: testUsers.doctor.password,
  });

  if (doctorLogin.success) {
    console.log("   ✅ Doctor login successful");
    tokens.doctorToken = doctorLogin.data.token;
  } else {
    console.log(
      "   ❌ Doctor login failed:",
      doctorLogin.error?.message || "Unknown error"
    );
  }

  // Login patient
  console.log("   Logging in patient...");
  const patientLogin = await makeRequest("POST", `${API_URL}/auth/login`, {
    email: testUsers.patient.email,
    password: testUsers.patient.password,
  });

  if (patientLogin.success) {
    console.log("   ✅ Patient login successful");
    tokens.patientToken = patientLogin.data.token;
  } else {
    console.log(
      "   ❌ Patient login failed:",
      patientLogin.error?.message || "Unknown error"
    );
  }

  return doctorLogin.success && patientLogin.success;
}

async function testGetCurrentUser() {
  console.log("\n👤 Testing Get Current User...");

  if (!tokens.doctorToken) {
    console.log("❌ No doctor token available");
    return false;
  }

  const result = await makeRequest(
    "GET",
    `${API_URL}/auth/me`,
    null,
    tokens.doctorToken
  );

  if (result.success) {
    console.log("✅ Current user retrieved");
    const user = result.data.data?.user;
    if (user) {
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
    }
  } else {
    console.log(
      "❌ Get current user failed:",
      result.error?.message || "Unknown error"
    );
  }

  return result.success;
}

async function testUnauthorizedAccess() {
  console.log("\n🚫 Testing Unauthorized Access...");

  // Test without token
  const noTokenResult = await makeRequest("GET", `${API_URL}/auth/me`);

  if (!noTokenResult.success && noTokenResult.status === 401) {
    console.log("   ✅ Unauthorized access properly blocked (no token)");
  } else {
    console.log("   ❌ Unauthorized access not blocked properly");
  }

  // Test with invalid token
  const invalidTokenResult = await makeRequest(
    "GET",
    `${API_URL}/auth/me`,
    null,
    "invalid_token"
  );

  if (!invalidTokenResult.success && invalidTokenResult.status === 401) {
    console.log("   ✅ Unauthorized access properly blocked (invalid token)");
  } else {
    console.log("   ❌ Invalid token not handled properly");
  }

  return !noTokenResult.success && !invalidTokenResult.success;
}

// Enhanced test runner with better error handling
async function runComprehensiveTests() {
  console.log("🚀 Starting MediVault Comprehensive API Tests...\n");
  console.log("=".repeat(60));

  // Check if server is running first
  console.log("🔍 Checking server availability...");
  const healthCheck = await testHealthCheck();

  if (!healthCheck) {
    console.log("\n❌ Server is not running or not accessible.");
    console.log("📋 Please ensure:");
    console.log("   1. Server is started: node server-fixed.js");
    console.log("   2. MongoDB is running");
    console.log("   3. No firewall blocking port 5000");
    return;
  }

  const tests = [
    { name: "API Information", fn: testAPIInfo },
    { name: "User Registration", fn: testUserRegistration },
    { name: "User Login", fn: testUserLogin },
    { name: "Get Current User", fn: testGetCurrentUser },
    { name: "Unauthorized Access", fn: testUnauthorizedAccess },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} crashed:`, error.message);
      failed++;
    }

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results Summary:");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`
  );

  if (failed === 0) {
    console.log("\n🎉 All tests passed! MediVault API is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Check the output above for details.");
    console.log("\n💡 Troubleshooting tips:");
    console.log("   - Ensure server is running: node server-fixed.js");
    console.log("   - Check MongoDB connection");
    console.log("   - Verify .env configuration");
    console.log("   - Check for port conflicts");
  }

  console.log("\n🔗 Test Data Created:");
  console.log("   Tokens:", Object.keys(tokens));
  console.log("   Test IDs:", Object.keys(testIds));

  if (Object.keys(tokens).length > 0) {
    console.log(
      "\n📋 You can now test protected endpoints using these tokens."
    );
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests().catch((error) => {
    console.error("Test runner crashed:", error);
    process.exit(1);
  });
}

module.exports = {
  runComprehensiveTests,
  makeRequest,
  testUsers,
  BASE_URL,
  API_URL,
  tokens,
  testIds,
};
