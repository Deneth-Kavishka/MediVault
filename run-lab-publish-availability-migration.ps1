# PowerShell script to run lab publish + availability migration

Write-Host "Lab Publish/Availability Migration" -ForegroundColor Cyan
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
Write-Host "Running migration: migration_add_lab_publish_availability.sql" -ForegroundColor Yellow

try {
    npx tsx .\run-lab-publish-availability-migration.ts

    if ($LASTEXITCODE -ne 0) {
        throw "Migration command failed"
    }
} catch {
    Write-Host "`n❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Done." -ForegroundColor Green
Write-Host "Next: restart your server (npm run dev)" -ForegroundColor Yellow
