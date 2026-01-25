import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
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

function getArgValue(flag: string) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const fileArg = process.argv[2];
  const filePath = fileArg ? resolve(process.cwd(), fileArg) : undefined;

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
    ...(shouldUseSsl(databaseUrl)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
    ...(statementTimeoutMs > 0
      ? { statement_timeout: statementTimeoutMs }
      : {}),
    max: 10,
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
