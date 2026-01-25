import "dotenv/config";
import pg from "pg";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env");
}

function shouldUseSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ...(shouldUseSsl(DATABASE_URL) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10,
});
const result = await pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='doctor_availability' ORDER BY ordinal_position"
);
console.log(
  "✅ Current columns:",
  result.rows.map((x) => x.column_name).join(", ")
);
await pool.end();
