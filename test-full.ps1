# Comprehensive Test Script
# Starts server in background and tests all endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Project Loading Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PORT = 3001
$BASE_URL = "http://localhost:$PORT"

# Start server in background
Write-Host "Starting server in background..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\project\DreammakerCryptoSignalAndTrader-CLEAN-PATCH7"
    npm run dev:server 2>&1
}

Write-Host "Waiting for server to start (up to 60 seconds)..." -ForegroundColor Cyan
$serverReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $test = Invoke-WebRequest -Uri "$BASE_URL/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $serverReady = $true
        Write-Host "✅ Server is ready!" -ForegroundColor Green
        break
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

if (-not $serverReady) {
    Write-Host "❌ Server did not start" -ForegroundColor Red
    Write-Host "Server output:" -ForegroundColor Yellow
    Receive-Job $serverJob
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

# Test endpoints
$tests = @(
    @{Name="Health Check"; Url="$BASE_URL/api/health"},
    @{Name="Resource Stats"; Url="$BASE_URL/api/resources/stats"},
    @{Name="Resource Providers"; Url="$BASE_URL/api/resources/providers?category=market"},
    @{Name="Cache Efficiency"; Url="$BASE_URL/api/resources/cache-efficiency"},
    @{Name="Market Prices"; Url="$BASE_URL/api/market/prices?symbols=BTC,ETH,SOL"},
    @{Name="HF OHLCV"; Url="$BASE_URL/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=10"},
    @{Name="HF Health"; Url="$BASE_URL/api/hf/health"}
)

$passed = 0
$failed = 0
$errors = @()

foreach ($test in $tests) {
    Write-Host "[$($tests.IndexOf($test) + 1)/$($tests.Count)] Testing $($test.Name)..." -ForegroundColor Yellow -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host " ✅ PASSED" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " ⚠️  Status: $($response.StatusCode)" -ForegroundColor Yellow
            $failed++
            $errors += "$($test.Name): HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Host " ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $errors += "$($test.Name): $($_.Exception.Message)"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total: $($tests.Count)" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })

if ($errors.Count -gt 0) {
    Write-Host "`nErrors:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
}

# Cleanup
Write-Host "`nStopping server..." -ForegroundColor Yellow
Stop-Job $serverJob
Remove-Job $serverJob

Write-Host "`n✅ Test completed!" -ForegroundColor Green

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}

