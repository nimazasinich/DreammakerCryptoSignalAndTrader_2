#!/bin/bash
# Staging Deployment - Flag ON (Feature Test)
# Execute this on staging server after staging-flag-off.sh

set -e

echo "🚀 Staging Deployment - Flag ON (Feature Test)"
echo "================================================"
echo ""

# Check if server is running
if ! pgrep -f "npm run start" > /dev/null; then
  echo "⚠️  Server not running. Starting server..."
  npm run start > staging.log 2>&1 &
  sleep 5
fi

# Step 1: Set environment variables
echo "⚙️  Step 1: Setting environment variables..."
echo ""

# Update .env file
if grep -q "FEATURE_FUTURES" .env; then
  sed -i 's/^FEATURE_FUTURES=.*/FEATURE_FUTURES=true/' .env
else
  echo "FEATURE_FUTURES=true" >> .env
fi

if grep -q "EXCHANGE_KUCOIN" .env; then
  sed -i 's/^EXCHANGE_KUCOIN=.*/EXCHANGE_KUCOIN=true/' .env
else
  echo "EXCHANGE_KUCOIN=true" >> .env
fi

if grep -q "FUTURES_BASE_URL" .env; then
  sed -i 's|^FUTURES_BASE_URL=.*|FUTURES_BASE_URL=https://api-futures.kucoin.com|' .env
else
  echo "FUTURES_BASE_URL=https://api-futures.kucoin.com" >> .env
fi

echo "✅ Environment variables set:"
echo "   FEATURE_FUTURES=true"
echo "   EXCHANGE_KUCOIN=true"
echo "   FUTURES_BASE_URL=https://api-futures.kucoin.com"
echo ""

# Check for credentials
if ! grep -q "KUCOIN_FUTURES_KEY" .env || grep -q "KUCOIN_FUTURES_KEY=.*YOUR_KEY\|KUCOIN_FUTURES_KEY=$" .env; then
  echo "⚠️  WARNING: KuCoin Futures credentials not set!"
  echo "   Please add to .env:"
  echo "   KUCOIN_FUTURES_KEY=your_key"
  echo "   KUCOIN_FUTURES_SECRET=your_secret"
  echo "   KUCOIN_FUTURES_PASSPHRASE=your_passphrase"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 2: Restart server
echo "🔄 Step 2: Restarting server..."
pkill -f "npm run start" || true
sleep 2

# Load environment
set -a
source .env
set +a

npm run start > staging.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f staging.log"
echo ""

# Step 3: Wait for server
echo "⏳ Waiting for server to start..."
sleep 5

# Step 4: REST API smoke tests
echo ""
echo "🧪 Step 4: Running REST API smoke tests..."

# Test positions endpoint
echo "Testing GET /api/futures/positions..."
POSITIONS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/futures/positions | tail -1)
if [ "$POSITIONS_RESPONSE" = "200" ] || [ "$POSITIONS_RESPONSE" = "401" ]; then
  echo "✅ Positions endpoint accessible (HTTP $POSITIONS_RESPONSE)"
else
  echo "⚠️  Positions endpoint returned HTTP $POSITIONS_RESPONSE"
fi

# Test leverage endpoint
echo "Testing PUT /api/futures/leverage..."
LEVERAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT http://localhost:3001/api/futures/leverage \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}' | tail -1)
if [ "$LEVERAGE_RESPONSE" = "200" ] || [ "$LEVERAGE_RESPONSE" = "401" ] || [ "$LEVERAGE_RESPONSE" = "400" ]; then
  echo "✅ Leverage endpoint accessible (HTTP $LEVERAGE_RESPONSE)"
else
  echo "⚠️  Leverage endpoint returned HTTP $LEVERAGE_RESPONSE"
fi

# Test funding rate endpoint
echo "Testing GET /api/futures/funding/BTCUSDTM..."
FUNDING_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/futures/funding/BTCUSDTM | tail -1)
if [ "$FUNDING_RESPONSE" = "200" ] || [ "$FUNDING_RESPONSE" = "401" ]; then
  echo "✅ Funding rate endpoint accessible (HTTP $FUNDING_RESPONSE)"
else
  echo "⚠️  Funding rate endpoint returned HTTP $FUNDING_RESPONSE"
fi

# Test invalid payload (should return 400)
echo "Testing invalid payload (should return 400)..."
VALIDATION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/futures/orders \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","side":"BUY","type":"MARKET","qty":0}' | tail -1)
if [ "$VALIDATION_RESPONSE" = "400" ]; then
  echo "✅ Validation working correctly (HTTP 400 for invalid payload)"
else
  echo "⚠️  Validation returned HTTP $VALIDATION_RESPONSE (expected 400)"
fi

# Step 5: WebSocket test
echo ""
echo "📡 Step 5: WebSocket test"
echo "To test WebSocket manually, run:"
echo "  npx wscat -c ws://localhost:3001/ws/futures"
echo ""
echo "Expected messages:"
echo "  - {\"type\":\"futures_connected\",\"message\":\"Connected to futures channel\"}"
echo "  - {\"type\":\"position_update\",\"data\":[...],\"timestamp\":...}"
echo "  - {\"type\":\"order_update\",\"data\":[...],\"timestamp\":...}"
echo "  - {\"type\":\"funding_tick\",\"data\":{...},\"timestamp\":...}"
echo ""

echo "✅ Staging deployment (flag ON) complete!"
echo ""
echo "Server PID: $SERVER_PID"
echo "To stop: kill $SERVER_PID"
echo "To view logs: tail -f staging.log"
echo ""
echo "Next steps:"
echo "  1. Monitor logs for 5xx errors"
echo "  2. Check metrics/alerts for rate limits"
echo "  3. Test WebSocket connection manually"
echo "  4. When ready, proceed to production deployment"
