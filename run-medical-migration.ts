// Run migration for medical documents and access logs
import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function runMigration() {
  try {
    console.log(
      "🚀 Starting migration: Add medical documents and access logs tables\n"
    );

    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(
      "./migration_add_medical_documents_access_logs.sql",
      "utf-8"
    );

    // Remove comments and split into statements
    const lines = migrationSQL.split("\n");
    let currentStatement = "";
    const statements: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comment-only lines
      if (trimmedLine.startsWith("--") || trimmedLine.length === 0) {
        continue;
      }

      currentStatement += line + "\n";

      // Check if statement is complete (ends with semicolon)
      if (trimmedLine.endsWith(";")) {
        const stmt = currentStatement.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        currentStatement = "";
      }
    }

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let executed = 0;
    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
        executed++;

        // Show what type of statement was executed
        if (statement.toUpperCase().includes("CREATE TABLE")) {
          const tableName = statement.match(
            /CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i
          )?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.toUpperCase().includes("CREATE INDEX")) {
          const indexName = statement.match(/CREATE INDEX (\w+)/i)?.[1];
          console.log(`✅ Created index: ${indexName}`);
        } else if (statement.toUpperCase().includes("COMMENT ON")) {
          console.log(`✅ Added comment`);
        }
      } catch (error: any) {
        // Handle expected errors gracefully
        if (error.code === "42P07") {
          console.log(`⚠️  Table already exists, skipping`);
        } else if (error.code === "42710") {
          console.log(`⚠️  Index already exists, skipping`);
        } else {
          console.error(`❌ Error executing statement: ${error.message}`);
          throw error;
        }
      }
    }

    console.log(
      `\n✅ Migration completed successfully! Executed ${executed} statements.`
    );
    console.log("\n📊 Database schema updated with:");
    console.log(
      "  ✓ medical_documents table (lab reports, prescriptions, medical files)"
    );
    console.log(
      "  ✓ medical_access_logs table (audit trail for RBAC compliance)"
    );
    console.log("  ✓ Indexes for optimal query performance");
    console.log("  ✓ Table comments for documentation");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
