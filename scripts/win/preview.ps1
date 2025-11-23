# Windows Preview Script
# Builds and previews the production build

$ErrorActionPreference = "Stop"

Write-Host "Building and Previewing Dreammaker Crypto Signal & Trader..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Copying from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env file. Please configure it with your API keys." -ForegroundColor Green
        Write-Host ""
    }
}

# Build the application
Write-Host "Building application..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Build successful! Starting preview server..." -ForegroundColor Green
Write-Host ""

# Preview the build
npm run preview
