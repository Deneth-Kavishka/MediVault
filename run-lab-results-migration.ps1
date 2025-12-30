# PowerShell script to run lab results migration

Write-Host "Lab Results Database Migration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure you have a .env file with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Load DATABASE_URL from .env
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^DATABASE_URL=(.+)$") {
        $env:DATABASE_URL = $matches[1].Trim()
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDatabase URL loaded from .env" -ForegroundColor Green
Write-Host "Running migration: migration_update_lab_results.sql" -ForegroundColor Yellow

# Run migration using npx and pg
try {
    npx tsx -e "
    import { Pool } from 'pg';
    import { readFileSync } from 'fs';
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sql = readFileSync('migration_update_lab_results.sql', 'utf-8');
    
    pool.query(sql)
      .then(() => {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
      })
      .catch((err) => {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
      });
    "
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Lab Results migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nMigration Details:" -ForegroundColor Cyan
Write-Host "- Created lab_facilities table" -ForegroundColor White
Write-Host "- Added lab_facility_id to lab_tests" -ForegroundColor White
Write-Host "- Added enhanced date tracking fields" -ForegroundColor White
Write-Host "- Added urgency and technician_notes fields" -ForegroundColor White
Write-Host "- Created performance indexes" -ForegroundColor White
