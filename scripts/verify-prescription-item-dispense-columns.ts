import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

function shouldUseSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

async function main() {
  const pool = new Pool({
    connectionString: databaseUrl,
    ...(shouldUseSsl(databaseUrl)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
    max: 10,
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
