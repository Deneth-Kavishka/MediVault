
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    console.log('✅ Database connection successful!');
    console.log(`📅 Server time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].pg_version}`);
    
    // Check if tables exist
    console.log('\n📊 Checking tables...');
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. Run "npm run db:push" to create schema.');
    } else {
      console.log(`✅ Found ${tables.rows.length} tables:`);
      tables.rows.forEach((row: any) => {
        console.log(`   - ${row.tablename}`);
      });
    }
    
    // Check record counts
    console.log('\n📈 Record counts:');
    const counts = await db.execute(sql`
      SELECT 
        'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'patients', COUNT(*) FROM patients
      UNION ALL
      SELECT 'doctors', COUNT(*) FROM doctors
      UNION ALL
      SELECT 'appointments', COUNT(*) FROM appointments
      UNION ALL
      SELECT 'prescriptions', COUNT(*) FROM prescriptions
      UNION ALL
      SELECT 'medicines', COUNT(*) FROM medicines
    `);
    
    counts.rows.forEach((row: any) => {
      console.log(`   ${row.table_name}: ${row.count} records`);
    });
    
    console.log('\n✨ Database check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database check failed:');
    console.error(error);
    process.exit(1);
  }
}

checkDatabase();
