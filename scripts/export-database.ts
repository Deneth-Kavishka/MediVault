// Database export script - Creates SQL dump with full schema and sample data
import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

async function exportDatabase() {
  console.log("📦 Exporting MediVault database...\n");

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Parse database URL
    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "5432";

    // Create database directory
    const dbDir = path.join(process.cwd(), "database");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const outputFile = path.join(dbDir, "medivault_sample_data.sql");
    const timestamp = new Date().toISOString().split("T")[0];

    console.log("Database:", dbName);
    console.log("Output file:", outputFile);
    console.log("");

    // Set environment variable for password
    process.env.PGPASSWORD = password;

    // Export database using pg_dump
    console.log("🔄 Running pg_dump...");
    const pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --clean --if-exists --insert -f ${outputFile}`;

    await execAsync(pgDumpCmd);

    // Add header comment to SQL file
    const header = `-- ============================================================================
-- MediVault Healthcare Management System - Sample Database
-- Generated: ${timestamp}
-- ============================================================================
-- 
-- This SQL file contains the complete schema and sample data for MediVault.
-- 
-- USAGE:
-- 1. Create a new PostgreSQL database:
--    CREATE DATABASE medivault;
-- 
-- 2. Import this file:
--    psql -U your_user -d medivault -f medivault_sample_data.sql
-- 
-- 3. Update .env file with your database credentials:
--    DATABASE_URL=postgresql://your_user:your_password@localhost:5432/medivault
-- 
-- SAMPLE CREDENTIALS:
-- Admin: admin / password123
-- Doctors: dr.silva, dr.fernando, dr.perera / password123
-- Patients: patient.john, patient.jane, patient.bob, patient.alice / password123
-- Pharmacist: pharmacist.kumar / password123
-- Lab Technician: labtech.sarah / password123
-- 
-- ============================================================================

`;

    const sqlContent = fs.readFileSync(outputFile, "utf8");
    fs.writeFileSync(outputFile, header + sqlContent);

    // Create import instructions file
    const instructionsFile = path.join(dbDir, "IMPORT_INSTRUCTIONS.md");
    const instructions = `# Database Import Instructions

## Quick Import

\`\`\`bash
# 1. Create database
createdb -U postgres medivault

# 2. Import SQL file
psql -U postgres -d medivault -f medivault_sample_data.sql

# 3. Verify import
psql -U postgres -d medivault -c "\\dt"
\`\`\`

## Alternative: Using Migration & Seeders

If you prefer to use Drizzle migrations and seeders:

\`\`\`bash
# 1. Push schema to database
npm run db:push

# 2. Seed sample data
npm run seed
\`\`\`

## Sample Login Credentials

All passwords are: **password123**

### Admin
- Username: \`admin\`

### Doctors
- \`dr.silva\` (Cardiology)
- \`dr.fernando\` (Pediatrics)
- \`dr.perera\` (General Medicine)

### Patients
- \`patient.john\`
- \`patient.jane\`
- \`patient.bob\`
- \`patient.alice\`

### Pharmacist
- \`pharmacist.kumar\`

### Lab Technician
- \`labtech.sarah\`

## Troubleshooting

### Permission Denied

\`\`\`bash
# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE medivault TO your_user;"
psql -U postgres -d medivault -c "GRANT ALL ON SCHEMA public TO your_user;"
\`\`\`

### Import Errors

If you encounter errors during import:

1. Drop and recreate the database:
\`\`\`bash
dropdb medivault
createdb medivault
\`\`\`

2. Try importing again

### Connection Issues

Verify your DATABASE_URL in .env matches your PostgreSQL setup:
\`\`\`env
DATABASE_URL=postgresql://username:password@localhost:5432/medivault
\`\`\`
`;

    fs.writeFileSync(instructionsFile, instructions);

    // Get file size
    const stats = fs.statSync(outputFile);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log("");
    console.log("✅ Database exported successfully!");
    console.log("");
    console.log("========================================");
    console.log("📊 EXPORT SUMMARY");
    console.log("========================================");
    console.log("Output file:", outputFile);
    console.log("File size:", fileSizeInMB, "MB");
    console.log("Instructions:", instructionsFile);
    console.log("========================================");
    console.log("");
    console.log("📝 To import this database:");
    console.log("1. Create a new database: createdb medivault");
    console.log(`2. Import SQL: psql -d medivault -f ${outputFile}`);
    console.log("");
  } catch (error: any) {
    console.error("\n❌ Export failed:", error.message);
    console.error("\nPlease ensure:");
    console.error("1. PostgreSQL is running");
    console.error("2. pg_dump is installed and in your PATH");
    console.error("3. DATABASE_URL is correctly set in .env");
    process.exit(1);
  }
}

exportDatabase();
