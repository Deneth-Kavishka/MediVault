import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_DATABASE_URL =
  "postgresql://medivault:Alpha@localhost:5432/medivault";

function getArgValue(flag: string) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const fileArg = process.argv[2];
  const filePath = fileArg ? resolve(process.cwd(), fileArg) : undefined;
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

  if (!filePath) {
    console.error("Usage: npx tsx scripts/run-sql-file.ts <path-to-sql>");
    process.exit(1);
  }

  const silent = process.argv.includes("--silent");
  const statementTimeoutMs = Number(
    getArgValue("--statement-timeout-ms") || "0"
  );

  if (!silent) {
    console.log("Running SQL file:", filePath);
    console.log("DATABASE_URL:", databaseUrl.replace(/:[^:]*@/, ":****@"));
  }

  const sqlText = readFileSync(filePath, "utf-8");

  const pool = new Pool({
    connectionString: databaseUrl,
    ...(statementTimeoutMs > 0
      ? { statement_timeout: statementTimeoutMs }
      : {}),
  } as any);

  try {
    await pool.query(sqlText);
    if (!silent) console.log("✅ Migration applied successfully");
  } catch (err: any) {
    console.error("❌ Failed to apply SQL file");
    console.error(err?.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
