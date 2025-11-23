#!/bin/bash
# Production Enable - Enable Futures Feature Flag
# Execute this AFTER production-deploy.sh and credential setup

set -e

echo "🚀 Production Enable - Futures Feature Flag"
echo "==========================================="
echo ""

# Safety check
echo "⚠️  WARNING: This will enable futures trading in production!"
echo ""
read -p "Have you:"
echo "  [ ] Added KuCoin production credentials to .env?"
echo "  [ ] Tested on staging successfully?"
echo "  [ ] Set up monitoring/alerts?"
echo "  [ ] Scheduled a maintenance window?"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Step 1: Update environment
echo ""
echo "⚙️  Step 1: Enabling feature flag..."

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

echo "✅ Feature flags enabled"

# Verify credentials
if ! grep -q "KUCOIN_FUTURES_KEY" .env || grep -q "KUCOIN_FUTURES_KEY=.*YOUR_KEY\|KUCOIN_FUTURES_KEY=$" .env; then
  echo ""
  echo "❌ ERROR: KuCoin Futures credentials not set!"
  echo "   Please add to .env before continuing."
  exit 1
fi

# Step 2: Restart server
echo ""
echo "🔄 Step 2: Restarting server..."
pkill -f "npm run start" || true
sleep 2

# Load environment
set -a
source .env
set +a

npm run start > production.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f production.log"
echo ""

# Step 3: Wait for server
echo "⏳ Waiting for server to start..."
sleep 5

# Step 4: Smoke tests
echo ""
echo "🧪 Step 4: Running smoke tests..."

# Test positions endpoint
echo "Testing GET /api/futures/positions..."
POSITIONS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/futures/positions | tail -1)
if [ "$POSITIONS_RESPONSE" = "200" ] || [ "$POSITIONS_RESPONSE" = "401" ]; then
  echo "✅ Positions endpoint accessible (HTTP $POSITIONS_RESPONSE)"
else
  echo "⚠️  Positions endpoint returned HTTP $POSITIONS_RESPONSE"
fi

# Test funding rate endpoint
echo "Testing GET /api/futures/funding/BTCUSDTM..."
FUNDING_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/futures/funding/BTCUSDTM | tail -1)
if [ "$FUNDING_RESPONSE" = "200" ] || [ "$FUNDING_RESPONSE" = "401" ]; then
  echo "✅ Funding rate endpoint accessible (HTTP $FUNDING_RESPONSE)"
else
  echo "⚠️  Funding rate endpoint returned HTTP $FUNDING_RESPONSE"
fi

echo ""
echo "✅ Production feature enabled!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  MONITORING CHECKLIST:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Watch logs for:"
echo "   - 5xx errors (tail -f production.log | grep -i error)"
echo "   - Rate limit warnings"
echo "   - Database connection issues"
echo ""
echo "✅ Monitor metrics:"
echo "   - API response times"
echo "   - Error rates"
echo "   - WebSocket connection stability"
echo ""
echo "✅ Rollback if needed:"
echo "   Run: scripts/rollout/production-rollback.sh"
echo ""
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f production.log"
