# PowerShell script to run the status fields migration
# This connects directly to the database and runs the SQL migration

Write-Host "Running Doctor Availability Status Fields Migration..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure you have a .env file with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Load DATABASE_URL from .env
Get-Content .env | ForEach-Object {
    if ($_ -match "^DATABASE_URL=(.+)$") {
        $env:DATABASE_URL = $matches[1]
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL loaded from .env" -ForegroundColor Green

# Run the TypeScript migration script
Write-Host "`nExecuting migration script..." -ForegroundColor Cyan
npx tsx scripts/add-status-fields.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nMigration completed successfully! ✓" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your development server" -ForegroundColor Yellow
    Write-Host "2. Refresh the admin portal" -ForegroundColor Yellow
    Write-Host "3. Status badges should now display correctly" -ForegroundColor Yellow
} else {
    Write-Host "`nMigration failed! ✗" -ForegroundColor Red
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
}
