import pg from "pg";
const pool = new pg.Pool({
  connectionString: "postgresql://medivault:Alpha@localhost:5432/medivault",
});
const result = await pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='doctor_availability' ORDER BY ordinal_position"
);
console.log(
  "✅ Current columns:",
  result.rows.map((x) => x.column_name).join(", ")
);
await pool.end();
