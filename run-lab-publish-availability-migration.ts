import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (check your .env)");
  }

  // Railway-hosted Postgres typically requires SSL.
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
    const sql = readFileSync(
      "migration_add_lab_publish_availability.sql",
      "utf-8"
    );

    await pool.query(sql);

    const check = await pool.query<{
      column_name: string;
    }>(
      `
      SELECT
        column_name
      FROM information_schema.columns
      WHERE table_name = 'lab_facilities'
        AND column_name IN ('is_published', 'is_available', 'availability_schedule')
      ORDER BY column_name;
      `.trim()
    );

    // eslint-disable-next-line no-console
    console.log("✅ Migration completed successfully!");
    // eslint-disable-next-line no-console
    console.log(
      "Columns present:",
      check.rows.map((r) => r.column_name).join(", ") || "(none)"
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Migration failed:", err?.message ?? err);
  process.exit(1);
});
