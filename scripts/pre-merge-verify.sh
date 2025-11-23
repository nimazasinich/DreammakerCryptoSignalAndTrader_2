#!/bin/bash
# One-shot pre-merge verification for futures integration
# Run this on your feature branch before pushing

set -e

echo "🔍 Pre-Merge Verification for Futures Integration"
echo "=================================================="
echo ""

# Check we're on feature branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $BRANCH"
if [[ "$BRANCH" != "feature/futures-integration" ]]; then
  echo "⚠️  Warning: Not on feature/futures-integration branch"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo ""

# Check git status
echo "1️⃣  Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "✅ Changes detected (ready to commit)"
else
  echo "ℹ️  No uncommitted changes"
fi
echo ""

# Install dependencies
echo "2️⃣  Installing dependencies..."
npm ci
echo "✅ Dependencies installed"
echo ""

# Run lint
echo "3️⃣  Running linter..."
npm run lint
echo "✅ Lint passed"
echo ""

# Run build
echo "4️⃣  Building project..."
npm run build
echo "✅ Build successful"
echo ""

# Verify integration
echo "5️⃣  Verifying integration..."
bash scripts/verify-futures-integration.sh
echo ""

# Check feature flags default to false
echo "6️⃣  Verifying feature flags default to false..."
if grep -q 'FEATURE_FUTURES.*false\|FEATURE_FUTURES.*process.env.FEATURE_FUTURES === '\''true'\''' src/config/flags.ts; then
  echo "✅ FEATURE_FUTURES defaults to false"
else
  echo "❌ ERROR: FEATURE_FUTURES does not default to false!"
  exit 1
fi

if grep -q 'EXCHANGE_KUCOIN.*true\|EXCHANGE_KUCOIN.*process.env.EXCHANGE_KUCOIN !== '\''false'\''' src/config/flags.ts; then
  echo "✅ EXCHANGE_KUCOIN defaults to true"
else
  echo "⚠️  Warning: EXCHANGE_KUCOIN does not default to true"
fi
echo ""

# Check .env.example has defaults
echo "7️⃣  Verifying .env.example..."
if grep -q 'FEATURE_FUTURES=false' .env.example; then
  echo "✅ .env.example has FEATURE_FUTURES=false"
else
  echo "❌ ERROR: .env.example missing FEATURE_FUTURES=false!"
  exit 1
fi
echo ""

# Check for secrets in code
echo "8️⃣  Checking for secrets in code..."
if grep -r "KUCOIN_FUTURES_KEY.*=.*[^$]" src/ --exclude-dir=node_modules 2>/dev/null | grep -v "process.env\|your_key\|your_secret"; then
  echo "❌ ERROR: Potential secrets found in code!"
  exit 1
else
  echo "✅ No hardcoded secrets found"
fi
echo ""

# Optional: API smoke test (if server running)
echo "9️⃣  Optional: API smoke test..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "⚠️  Server detected on port 3001"
  read -p "Run API smoke tests? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash scripts/test-futures-api.sh
  fi
else
  echo "ℹ️  Server not running (skip API smoke tests)"
fi
echo ""

echo "✅ Pre-merge verification complete!"
echo ""
echo "Next steps:"
echo "1. git fetch origin"
echo "2. git rebase origin/main"
echo "3. git add -A"
echo "4. git commit -S -m 'feat(futures): adapter-based futures integration behind flag'"
echo "5. git push --force-with-lease origin HEAD"
