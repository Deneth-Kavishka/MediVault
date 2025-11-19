import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = "postgresql://medivault:Alpha@localhost:5432/medivault";

console.log("Testing database connection...");
console.log("DATABASE_URL:", DATABASE_URL.replace(/:[^:]*@/, ":****@"));

const pool = new Pool({
  connectionString: DATABASE_URL,
});

try {
  const client = await pool.connect();
  console.log("✅ Successfully connected to PostgreSQL!");

  const result = await client.query("SELECT current_database(), current_user;");
  console.log("Database:", result.rows[0].current_database);
  console.log("User:", result.rows[0].current_user);

  client.release();
  await pool.end();
  console.log("✅ Connection test passed!");
} catch (err) {
  console.error("❌ Connection failed:");
  console.error("Error:", err.message);
  console.error("\nPlease check:");
  console.error("1. PostgreSQL is running");
  console.error('2. Database "medivault" exists');
  console.error('3. User "medivault" exists with password "Alpha"');
  console.error("4. User has proper permissions");
  await pool.end();
  process.exit(1);
}
