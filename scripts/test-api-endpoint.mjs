import "dotenv/config";
import fetch from "node-fetch";

async function testAPI() {
  try {
    console.log("Testing /api/doctor-availability endpoint...\n");
    
    const response = await fetch("http://localhost:5000/api/doctor-availability", {
      headers: {
        "Cookie": "connect.sid=test"
      }
    });
    
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log("\nData received:", data.length, "records");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("Error response:", await response.text());
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAPI();
