# Windows Playwright Development Script
# Starts the development server for Playwright tests

$ErrorActionPreference = "Stop"

Write-Host "Starting Development Server for Playwright Tests..." -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes on ports 5173 and 3001
Write-Host "Checking for existing processes..." -ForegroundColor Yellow

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($port5173) {
    Write-Host "Killing process on port 5173..." -ForegroundColor Yellow
    $processId = $port5173.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if ($port3001) {
    Write-Host "Killing process on port 3001..." -ForegroundColor Yellow
    $processId = $port3001.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:3001" -ForegroundColor Cyan
Write-Host ""

# Start the development server
npm run dev


