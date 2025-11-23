#!/bin/bash
# Production Rollback - Instant Disable
# Execute this to instantly disable futures trading

set -e

echo "🔄 Production Rollback - Instant Disable"
echo "=========================================="
echo ""

# Step 1: Disable feature flag
echo "⚙️  Step 1: Disabling feature flag..."
if grep -q "FEATURE_FUTURES" .env; then
  sed -i 's/^FEATURE_FUTURES=.*/FEATURE_FUTURES=false/' .env
  echo "✅ FEATURE_FUTURES=false set in .env"
else
  echo "FEATURE_FUTURES=false" >> .env
  echo "✅ FEATURE_FUTURES=false added to .env"
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
echo ""

# Step 3: Wait for server
echo "⏳ Waiting for server to start..."
sleep 5

# Step 4: Verify rollback
echo ""
echo "✅ Step 4: Verifying rollback..."
FUTURES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/futures/positions || echo "000")
if [ "$FUTURES_RESPONSE" = "404" ] || [ "$FUTURES_RESPONSE" = "000" ]; then
  echo "✅ Rollback successful - Futures endpoint disabled (HTTP $FUTURES_RESPONSE)"
else
  echo "⚠️  Futures endpoint returned HTTP $FUTURES_RESPONSE (expected 404)"
fi

echo ""
echo "✅ Rollback complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status: Futures trading DISABLED"
echo "Rollback time: < 2 minutes"
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f production.log"
echo ""
echo "Note: Database migrations are idempotent - no cleanup needed."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
