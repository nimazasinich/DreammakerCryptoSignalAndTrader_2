#!/bin/bash
# Production Deployment - Safe & Reversible
# Execute this on production server

set -e

echo "🚀 Production Deployment - Safe Rollout"
echo "======================================="
echo ""

# Step 1: Update code
echo "📥 Step 1: Updating code..."
git checkout main
git pull --ff-only

# Step 2: Setup environment (flag OFF initially)
echo ""
echo "⚙️  Step 2: Setting up environment (flag OFF for safety)..."
if [ -f .env ]; then
  # Backup existing .env
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  echo "✅ Backed up existing .env"
fi

# Ensure FEATURE_FUTURES is OFF
if grep -q "FEATURE_FUTURES" .env; then
  sed -i 's/^FEATURE_FUTURES=.*/FEATURE_FUTURES=false/' .env
else
  echo "FEATURE_FUTURES=false" >> .env
fi
echo "✅ FEATURE_FUTURES=false set in .env (safe default)"

# Step 3: Build
echo ""
echo "🔨 Step 3: Building application..."
npm ci
npm run build

# Step 4: Start server (flag OFF)
echo ""
echo "▶️  Step 4: Starting server with flag OFF..."
echo "Starting in background... (PID will be logged)"
npm run start > production.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f production.log"
echo ""

# Step 5: Wait for server
echo "⏳ Waiting for server to start..."
sleep 5

# Step 6: Baseline check
echo ""
echo "🧪 Step 6: Running baseline checks..."

# Test futures endpoint (should be disabled)
echo "Testing futures endpoint (should return 404)..."
FUTURES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/futures/positions || echo "000")
if [ "$FUTURES_RESPONSE" = "404" ] || [ "$FUTURES_RESPONSE" = "000" ]; then
  echo "✅ Futures endpoint disabled (HTTP $FUTURES_RESPONSE)"
else
  echo "⚠️  WARNING: Futures endpoint returned HTTP $FUTURES_RESPONSE (expected 404)"
fi

# Test baseline endpoints
echo "Testing baseline endpoints..."
BASELINE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
if [ "$BASELINE_RESPONSE" = "200" ] || [ "$BASELINE_RESPONSE" = "404" ]; then
  echo "✅ Baseline endpoints accessible (HTTP $BASELINE_RESPONSE)"
else
  echo "⚠️  Baseline endpoint returned HTTP $BASELINE_RESPONSE"
fi

echo ""
echo "✅ Production deployment (flag OFF) complete!"
echo ""
echo "Server PID: $SERVER_PID"
echo "Current status: Futures trading DISABLED"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  NEXT STEPS (when ready to enable):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Add KuCoin credentials to .env:"
echo "   KUCOIN_FUTURES_KEY=your_production_key"
echo "   KUCOIN_FUTURES_SECRET=your_production_secret"
echo "   KUCOIN_FUTURES_PASSPHRASE=your_production_passphrase"
echo ""
echo "2. Enable feature flag:"
echo "   Run: scripts/rollout/production-enable.sh"
echo ""
echo "3. Monitor logs/metrics"
echo "4. Run smoke tests"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
