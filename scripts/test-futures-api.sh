#!/bin/bash
# Futures API Smoke Tests
# Run this after starting the server with FEATURE_FUTURES=true

BASE_URL="${BASE_URL:-http://localhost:3001}"
API_BASE="${API_BASE:-$BASE_URL/api/futures}"

echo "🧪 Futures API Smoke Tests"
echo "=========================="
echo "Base URL: $API_BASE"
echo ""

# Test 1: Get Positions
echo "1️⃣  Testing GET /api/futures/positions"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE/positions")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 2: Place MARKET Order (may fail without valid credentials)
echo "2️⃣  Testing POST /api/futures/orders (MARKET)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE/orders" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","side":"buy","type":"market","qty":1,"leverage":5,"marginMode":"isolated"}')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 3: Set Leverage
echo "3️⃣  Testing PUT /api/futures/leverage"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/leverage" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 4: Get Funding Rate
echo "4️⃣  Testing GET /api/futures/funding/BTCUSDTM"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE/funding/BTCUSDTM")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 5: Get Open Orders
echo "5️⃣  Testing GET /api/futures/orders"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE/orders")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 6: Negative Test - Invalid Order (should return 400)
echo "6️⃣  Testing POST /api/futures/orders (INVALID - should return 400)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE/orders" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","side":"buy","type":"market","qty":0,"leverage":0,"marginMode":"isolated"}')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS (expected: 400)"
echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 7: Feature Flag OFF Test (if FEATURE_FUTURES=false)
echo "7️⃣  Testing feature flag disabled response"
echo "Note: Set FEATURE_FUTURES=false to test this"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE/positions")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
if [ "$HTTP_STATUS" = "404" ]; then
  echo "✅ Feature flag working correctly (404 when disabled)"
else
  echo "Status: $HTTP_STATUS"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

echo "✅ Smoke tests complete!"
echo ""
echo "Note: Some tests may fail if:"
echo "  - KuCoin Futures credentials are not configured"
echo "  - Server is not running"
echo "  - Network issues"
