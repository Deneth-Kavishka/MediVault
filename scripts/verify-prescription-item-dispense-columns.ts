import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_DATABASE_URL =
  "postgresql://medivault:Alpha@localhost:5432/medivault";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  });

  try {
    const result = await pool.query(
      `
      select
        column_name,
        data_type,
        is_nullable,
        column_default
      from information_schema.columns
      where table_name = 'prescription_items'
        and column_name in ('dispensed', 'dispensed_at', 'dispensed_by')
      order by column_name;
      `.trim()
    );

    console.log(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
