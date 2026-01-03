import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const APPLY = process.argv.includes("--apply");

// Hardcoded targets per user confirmation (Jan 3, 2026)
const requestIds = [
  "1cb46b01-3db5-409e-8b73-6179388d373c",
  "daaa3abd-1d72-484d-bc9d-b30e7f150519",
];

const userIds = [
  "5a7c8064-0fb4-42eb-8b85-60660f426342",
  "5f7829a4-2532-49f1-9b3f-0a165441ba0e",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Check your .env file.");
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
console.log("DB:", masked);
console.log(APPLY ? "MODE: APPLY (will delete)" : "MODE: DRY-RUN (no changes)");

const pool = new Pool({ connectionString: url });

const q = async (client, text, params = []) => {
  const result = await client.query(text, params);
  return result.rows;
};

const asSqlInList = (arr) => `(${arr.map((_, i) => `$${i + 1}`).join(", ")})`;

try {
  const client = await pool.connect();
  try {
    const dbInfo = await q(
      client,
      "select current_database() as db, current_user as user, inet_server_addr() as addr, inet_server_port() as port;"
    );
    console.log("Connected:", dbInfo[0]);

    await client.query("BEGIN");

    // Show current rows
    const reqRows = await q(
      client,
      `
      select id, email, first_name, last_name, nic, status, submitted_at, reviewed_at, approved_user_id
      from patient_registration_requests
      where id in ${asSqlInList(requestIds)}
      order by submitted_at desc nulls last;
      `,
      requestIds
    );

    const usrRows = await q(
      client,
      `
      select id, username, email, first_name, last_name, role, created_at
      from users
      where id in ${asSqlInList(userIds)}
      order by created_at desc nulls last;
      `,
      userIds
    );

    const patRows = await q(
      client,
      `
      select id, user_id, nic, health_id, rfid, created_at
      from patients
      where user_id in ${asSqlInList(userIds)}
      order by created_at desc nulls last;
      `,
      userIds
    );

    console.log("\nTargets found:");
    console.log("- patient_registration_requests:", reqRows.length);
    console.table(reqRows);
    console.log("- users:", usrRows.length);
    console.table(usrRows);
    console.log("- patients:", patRows.length);
    console.table(patRows);

    if (reqRows.length !== requestIds.length) {
      throw new Error(
        `Expected ${requestIds.length} request rows, found ${reqRows.length}. Aborting.`
      );
    }
    if (usrRows.length !== userIds.length) {
      throw new Error(
        `Expected ${userIds.length} user rows, found ${usrRows.length}. Aborting.`
      );
    }

    // Delete in FK-safe order:
    // 1) registration requests (they reference approved_user_id -> users)
    // 2) patients (they reference user_id -> users)
    // 3) users

    const delReq = await q(
      client,
      `delete from patient_registration_requests where id in ${asSqlInList(
        requestIds
      )} returning id;`,
      requestIds
    );

    const delPatients = await q(
      client,
      `delete from patients where user_id in ${asSqlInList(
        userIds
      )} returning id;`,
      userIds
    );

    const delUsers = await q(
      client,
      `delete from users where id in ${asSqlInList(userIds)} returning id;`,
      userIds
    );

    console.log("\nDelete plan result:");
    console.log("- Would delete requests:", delReq.length);
    console.log("- Would delete patients:", delPatients.length);
    console.log("- Would delete users:", delUsers.length);

    if (APPLY) {
      await client.query("COMMIT");
      console.log("\n✅ Deleted successfully.");
    } else {
      await client.query("ROLLBACK");
      console.log(
        "\nℹ️ Dry-run complete (no changes were committed). Re-run with --apply to delete."
      );
    }
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw e;
  } finally {
    client.release();
  }
} catch (e) {
  console.error("\n❌ Failed:", e?.message || e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
