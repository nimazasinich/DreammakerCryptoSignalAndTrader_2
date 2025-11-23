# Futures API Smoke Tests
# Run this after starting the server with FEATURE_FUTURES=true

$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3001" }
$API_BASE = "$BASE_URL/api/futures"

Write-Host "🧪 Futures API Smoke Tests" -ForegroundColor Cyan
Write-Host "=========================="
Write-Host "Base URL: $API_BASE"
Write-Host ""

# Test 1: Get Positions
Write-Host "1️⃣  Testing GET /api/futures/positions" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/positions" -Method Get -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Place MARKET Order
Write-Host "2️⃣  Testing POST /api/futures/orders (MARKET)" -ForegroundColor Yellow
$orderBody = @{
    symbol = "BTCUSDTM"
    side = "buy"
    type = "market"
    qty = 1
    leverage = 5
    marginMode = "isolated"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/orders" -Method Post -Body $orderBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Set Leverage
Write-Host "3️⃣  Testing PUT /api/futures/leverage" -ForegroundColor Yellow
$leverageBody = @{
    symbol = "BTCUSDTM"
    leverage = 5
    marginMode = "isolated"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/leverage" -Method Put -Body $leverageBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Get Funding Rate
Write-Host "4️⃣  Testing GET /api/futures/funding/BTCUSDTM" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/funding/BTCUSDTM" -Method Get -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Get Open Orders
Write-Host "5️⃣  Testing GET /api/futures/orders" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/orders" -Method Get -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 6: Negative Test - Invalid Order (should return 400)
Write-Host "6️⃣  Testing POST /api/futures/orders (INVALID - should return 400)" -ForegroundColor Yellow
$invalidOrderBody = @{
    symbol = "BTCUSDTM"
    side = "buy"
    type = "market"
    qty = 0
    leverage = 0
    marginMode = "isolated"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/orders" -Method Post -Body $invalidOrderBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "⚠️  Unexpected success (should have failed)" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✅ Validation working correctly (400 Bad Request)" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected status: $statusCode" -ForegroundColor Red
    }
    Write-Host "Status: $statusCode"
}
Write-Host ""

Write-Host "✅ Smoke tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Some tests may fail if:" -ForegroundColor Yellow
Write-Host "  - KuCoin Futures credentials are not configured"
Write-Host "  - Server is not running"
Write-Host "  - Network issues"
