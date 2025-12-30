# Run SQL migration to add QR codes to existing prescriptions
Write-Host "Running migration to add QR codes to prescriptions..." -ForegroundColor Cyan

# Get database connection details from environment or use defaults
$env:PGPASSWORD = "postgres"  # Update this if your password is different
$dbName = "medivault"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

# Path to the SQL file
$sqlFile = Join-Path $PSScriptRoot "migration_add_qr_codes.sql"

# Run the SQL file
Write-Host "Connecting to database: $dbName" -ForegroundColor Yellow
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host "QR codes have been added to all prescriptions." -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration failed!" -ForegroundColor Red
    Write-Host "Please check if PostgreSQL is running and the database exists." -ForegroundColor Yellow
}
