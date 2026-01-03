import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://medivault:Alpha@localhost:5432/medivault",
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
