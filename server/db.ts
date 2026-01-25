import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

const databaseUrl = process.env.DATABASE_URL;

function shouldUseSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    // If parsing fails, default to SSL=true for hosted DBs.
    return true;
  }
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ...(shouldUseSsl(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
  max: Number(process.env.PG_POOL_MAX || 10),
  // Hosted DBs can be slower to connect; keep connections warm.
  keepAlive: true,
  // This timeout also applies while waiting for a free client from the pool.
  // Increase it so session-store queries don't fail under load.
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
});
export const db = drizzle(pool, { schema });
