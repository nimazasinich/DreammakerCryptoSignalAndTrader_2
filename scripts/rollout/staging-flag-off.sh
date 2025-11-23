#!/bin/bash
# Staging Deployment - Flag OFF (Backward Compatibility Check)
# Execute this on staging server

set -e

echo "🚀 Staging Deployment - Flag OFF (Backward Compatibility)"
echo "=========================================================="
echo ""

# Step 1: Update code
echo "📥 Step 1: Updating code..."
git checkout main
git pull --ff-only

# Step 2: Setup environment
echo ""
echo "⚙️  Step 2: Setting up environment..."
if [ -f .env.staging.example ]; then
  cp .env.staging.example .env
  echo "✅ Copied .env.staging.example to .env"
elif [ -f .env.example ]; then
  cp .env.example .env
  echo "✅ Copied .env.example to .env"
fi

# Ensure FEATURE_FUTURES is OFF
if grep -q "FEATURE_FUTURES" .env; then
  sed -i 's/^FEATURE_FUTURES=.*/FEATURE_FUTURES=false/' .env
else
  echo "FEATURE_FUTURES=false" >> .env
fi
echo "✅ FEATURE_FUTURES=false set in .env"

# Step 3: Build
echo ""
echo "🔨 Step 3: Building application..."
npm ci
npm run build

# Step 4: Start server
echo ""
echo "▶️  Step 4: Starting server..."
echo "Starting in background... (PID will be logged)"
npm run start > staging.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "Logs: tail -f staging.log"
echo ""

# Step 5: Wait for server
echo "⏳ Waiting for server to start..."
sleep 5

# Step 6: Smoke tests
echo ""
echo "🧪 Step 6: Running smoke tests..."

# Test futures endpoint (should be disabled)
echo "Testing futures endpoint (should return 404)..."
FUTURES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/futures/positions || echo "000")
if [ "$FUTURES_RESPONSE" = "404" ] || [ "$FUTURES_RESPONSE" = "000" ]; then
  echo "✅ Futures endpoint disabled (HTTP $FUTURES_RESPONSE)"
else
  echo "⚠️  WARNING: Futures endpoint returned HTTP $FUTURES_RESPONSE (expected 404)"
fi

# Test baseline endpoints (should work)
echo "Testing baseline endpoints..."
BASELINE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
if [ "$BASELINE_RESPONSE" = "200" ] || [ "$BASELINE_RESPONSE" = "404" ]; then
  echo "✅ Baseline endpoints accessible (HTTP $BASELINE_RESPONSE)"
else
  echo "⚠️  Baseline endpoint returned HTTP $BASELINE_RESPONSE"
fi

echo ""
echo "✅ Staging deployment (flag OFF) complete!"
echo ""
echo "Server PID: $SERVER_PID"
echo "To stop: kill $SERVER_PID"
echo "To view logs: tail -f staging.log"
echo ""
echo "Next step: Run staging-flag-on.sh to test with flag enabled"
