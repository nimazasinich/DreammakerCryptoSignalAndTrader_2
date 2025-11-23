#!/bin/bash
# Quick verification script for futures integration
# Checks that all files exist and basic structure is correct

echo "🔍 Futures Integration Verification"
echo "===================================="
echo ""

ERRORS=0

# Check required files exist
echo "Checking required files..."

FILES=(
  "src/types/futures.ts"
  "src/providers/futures/IFuturesExchange.ts"
  "src/providers/futures/KucoinFuturesAdapter.ts"
  "src/services/FuturesService.ts"
  "src/controllers/FuturesController.ts"
  "src/routes/futures.ts"
  "src/ws/futuresChannel.ts"
  "src/data/repositories/FuturesPositionRepository.ts"
  "src/data/repositories/FuturesOrderRepository.ts"
  ".env.example"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check feature flags in flags.ts
echo "Checking feature flags..."
if grep -q "FEATURE_FUTURES" src/config/flags.ts; then
  echo "✅ FEATURE_FUTURES flag found"
else
  echo "❌ FEATURE_FUTURES flag NOT found"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "EXCHANGE_KUCOIN" src/config/flags.ts; then
  echo "✅ EXCHANGE_KUCOIN flag found"
else
  echo "❌ EXCHANGE_KUCOIN flag NOT found"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check migration exists
echo "Checking database migration..."
if grep -q "create_futures_tables" src/data/DatabaseMigrations.ts; then
  echo "✅ Futures migration found"
else
  echo "❌ Futures migration NOT found"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check routes mounted in server.ts
echo "Checking routes..."
if grep -q "futuresRoutes" src/server.ts; then
  echo "✅ Futures routes mounted"
else
  echo "❌ Futures routes NOT mounted"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "/api/futures" src/server.ts; then
  echo "✅ /api/futures endpoint registered"
else
  echo "❌ /api/futures endpoint NOT registered"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check WebSocket channel
echo "Checking WebSocket integration..."
if grep -q "FuturesWebSocketChannel" src/server.ts; then
  echo "✅ FuturesWebSocketChannel integrated"
else
  echo "❌ FuturesWebSocketChannel NOT integrated"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check .env.example has futures config
echo "Checking .env.example..."
if grep -q "KUCOIN_FUTURES_KEY" .env.example; then
  echo "✅ KuCoin Futures env vars in .env.example"
else
  echo "❌ KuCoin Futures env vars NOT in .env.example"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! Integration appears complete."
  echo ""
  echo "Next steps:"
  echo "1. Update .env with your KuCoin Futures credentials"
  echo "2. Run: npm ci && npm run build && npm run start"
  echo "3. Test with: bash scripts/test-futures-api.sh"
  exit 0
else
  echo "❌ Found $ERRORS issue(s). Please review above."
  exit 1
fi
