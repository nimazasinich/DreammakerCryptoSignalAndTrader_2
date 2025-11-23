# test_free_endpoints.ps1
# Test script for free external APIs and local backend endpoints
# Usage: .\test_free_endpoints.ps1 [-ApiBase "http://localhost:8000/api"]
# Example: .\test_free_endpoints.ps1 -ApiBase "http://localhost:8000/api"

param(
    [string]$ApiBase = "http://localhost:8001/api"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "Free Resources Self-Test" "Blue"
Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "API Base: $ApiBase" "Green"
Write-Host ""

# Set environment variable
$env:API_BASE = $ApiBase

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18) {
        Write-ColorOutput "❌ Error: Node.js version 18+ is required" "Red"
        Write-ColorOutput "Current version: $nodeVersion" "Yellow"
        Write-ColorOutput "Please upgrade Node.js from https://nodejs.org/" "Yellow"
        exit 1
    }
    
    Write-ColorOutput "✅ Node.js version: $nodeVersion" "Green"
    Write-Host ""
}
catch {
    Write-ColorOutput "❌ Error: Node.js is not installed" "Red"
    Write-ColorOutput "Please install Node.js 18+ from https://nodejs.org/" "Yellow"
    exit 1
}

# Check if backend is running (optional warning)
try {
    $healthUrl = "$ApiBase/health"
    $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-ColorOutput "✅ Backend is running at $ApiBase" "Green"
    Write-Host ""
}
catch {
    Write-ColorOutput "⚠️  Warning: Backend does not appear to be running at $ApiBase" "Yellow"
    Write-ColorOutput "   Make sure to start the backend server first:" "Yellow"
    Write-ColorOutput "   npm run dev" "Yellow"
    Write-Host ""
    
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Run the test
Write-ColorOutput "Running tests..." "Blue"
Write-Host ""

try {
    node free_resources_selftest.mjs
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-ColorOutput "========================================" "Green"
        Write-ColorOutput "✅ All tests passed!" "Green"
        Write-ColorOutput "========================================" "Green"
    }
    elseif ($exitCode -eq 2) {
        Write-ColorOutput "========================================" "Red"
        Write-ColorOutput "❌ Some required endpoints failed!" "Red"
        Write-ColorOutput "========================================" "Red"
        Write-ColorOutput "Check the report in artifacts/ for details" "Yellow"
    }
    else {
        Write-ColorOutput "========================================" "Red"
        Write-ColorOutput "❌ Test execution failed!" "Red"
        Write-ColorOutput "========================================" "Red"
    }
    
    exit $exitCode
}
catch {
    Write-ColorOutput "❌ Fatal error during test execution:" "Red"
    Write-ColorOutput $_.Exception.Message "Red"
    exit 1
}

