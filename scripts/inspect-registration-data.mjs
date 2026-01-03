import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Check your .env file.");
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
console.log("Connecting with DATABASE_URL:", masked);

const pool = new Pool({ connectionString: url });

const query = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result.rows;
};

try {
  const info = await query(
    "select current_database() as db, current_user as user, inet_server_addr() as server_addr, inet_server_port() as server_port;"
  );
  console.log("DB:", info[0]);

  const tableCheck = await query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('patient_registration_requests', 'users', 'patients')
    order by table_name;
  `);
  const present = new Set(tableCheck.map((r) => r.table_name));
  for (const t of ["patient_registration_requests", "users", "patients"]) {
    console.log(`Table ${t}: ${present.has(t) ? "✅ present" : "❌ missing"}`);
  }

  if (!present.has("patient_registration_requests")) {
    console.log(
      "\nYour DB does not have patient_registration_requests yet. Run your patient-registration migration, then retry."
    );
    process.exit(0);
  }

  const counts = await query(`
    select
      (select count(*)::int from patient_registration_requests) as registration_requests,
      (select count(*)::int from users) as users,
      (select count(*)::int from patients) as patients;
  `);
  console.log("Counts:", counts[0]);

  const recentReq = await query(`
    select id, email, first_name, last_name, nic, status, submitted_at, reviewed_at, approved_user_id
    from patient_registration_requests
    order by submitted_at desc nulls last
    limit 10;
  `);
  console.log("\nRecent registration requests (max 10):");
  console.table(recentReq);

  const recentUsers = await query(`
    select id, username, email, first_name, last_name, role, created_at
    from users
    order by created_at desc nulls last
    limit 15;
  `);
  console.log("\nMost recent users (max 15):");
  console.table(recentUsers);

  const denethUsers = await query(`
    select id, username, email, first_name, last_name, role, created_at
    from users
    where
      (first_name ilike '%deneth%')
      or (last_name ilike '%kavishka%')
      or (username ilike '%deneth%')
      or (email ilike '%deneth%')
    order by created_at desc nulls last
    limit 20;
  `);
  console.log("\nUsers matching 'Deneth/Kavishka' (max 20):");
  console.table(denethUsers);

  const joined = await query(`
    select
      r.id as request_id,
      r.email,
      r.first_name,
      r.last_name,
      r.status,
      r.submitted_at,
      r.reviewed_at,
      r.approved_user_id,
      u.username as approved_username,
      p.id as patient_id,
      p.health_id,
      p.rfid
    from patient_registration_requests r
    left join users u on u.id = r.approved_user_id
    left join patients p on p.user_id = r.approved_user_id
    order by r.submitted_at desc nulls last
    limit 20;
  `);
  console.log("\nRecent requests with approved user/patient join (max 20):");
  console.table(joined);

  console.log("\nDone.");
} catch (e) {
  console.error("Failed:", e?.message || e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
