import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (check your .env)");
  }

  const shouldUseSsl = (() => {
    try {
      const host = new URL(databaseUrl).hostname;
      return host !== "localhost" && host !== "127.0.0.1";
    } catch {
      return true;
    }
  })();

  const pool = new Pool({
    connectionString: databaseUrl,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    max: 10,
  });

  try {
    const query = `
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'lab_tests'
        AND column_name IN (
          'result_file_path',
          'result_file_name',
          'result_file_mime',
          'result_file_size'
        )
      ORDER BY column_name;
    `;

    const result = await pool.query(query);
    console.log(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
