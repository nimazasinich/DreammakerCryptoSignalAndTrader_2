# Windows Development Script
# Starts the development server for both client and server

$ErrorActionPreference = "Stop"

Write-Host "Starting Dreammaker Crypto Signal & Trader (Development Mode)..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Copying from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env file. Please configure it with your API keys." -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "Error: .env.example not found. Cannot create .env file." -ForegroundColor Red
        exit 1
    }
}

# Start the development server (concurrently runs both client and server)
Write-Host "Starting development server..." -ForegroundColor Green
npm run dev
