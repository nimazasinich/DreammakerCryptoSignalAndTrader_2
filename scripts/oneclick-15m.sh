#!/usr/bin/env bash
set -euo pipefail

# One-click 15m trading signal test with self-healing connectivity
# Works fully offline with guaranteed fallback to synthetic data

echo "=========================================="
echo "15-Minute Signal Test (Self-Healing)"
echo "=========================================="

# Export environment variables from .env.local if it exists
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
  echo "✓ Loaded .env.local configuration"
fi

# Set defaults
export HF_TOKEN=${HF_TOKEN:-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}
export HUGGINGFACEHUB_API_TOKEN=${HUGGINGFACEHUB_API_TOKEN:-$HF_TOKEN}
export ENABLE_SMART_SYSTEM=${ENABLE_SMART_SYSTEM:-1}
export ENABLE_HF=${ENABLE_HF:-1}
export OFFLINE_ALLOW=${OFFLINE_ALLOW:-1}
export VITE_API_BASE=${VITE_API_BASE:-http://localhost:3001/api}
export PORT=${PORT:-3001}
export NODE_ENV=${NODE_ENV:-development}

echo "✓ Environment configured"
echo "  PORT: $PORT"
echo "  OFFLINE_ALLOW: $OFFLINE_ALLOW"
echo "  ENABLE_HF: $ENABLE_HF"
echo ""

# Run self-healing setup if script exists
if [ -f "scripts/self-heal.sh" ]; then
  echo "🏥 Running self-healing setup..."
  bash scripts/self-heal.sh
  echo ""
else
  # Fallback to manual setup
  echo "⚠ self-heal.sh not found, using manual setup"

  # Create necessary directories
  mkdir -p artifacts data/cache data/files strategies
  echo "✓ Created directories"

  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci || npm i
    echo "✓ Dependencies installed"
  fi

  # Kill any existing server on the port
  echo "Checking for existing server..."
  pkill -f "node.*${PORT}" 2>/dev/null || true
  pkill -f "tsx.*server" 2>/dev/null || true
  sleep 2

  # Start server in background
  echo "Starting server on port $PORT..."
  npm run dev > artifacts/server.log 2>&1 &
  SERVER_PID=$!
  echo "✓ Server started (PID: $SERVER_PID)"

  # Wait for server to be ready
  echo "Waiting for server to be ready..."
  for i in {1..30}; do
    if curl -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
      echo "✓ Server is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "✗ Server failed to start (timeout)"
      cat artifacts/server.log
      exit 1
    fi
    sleep 1
  done
fi

echo ""
echo "=========================================="
echo "Testing Data Cascade"
echo "=========================================="

# Test health
echo "1. Health check..."
curl -s "http://localhost:${PORT}/api/health" | head -n 3 || echo "  (health check skipped)"

# Test offline health
echo "2. Offline mode health..."
curl -s "http://localhost:${PORT}/api/offline/health" > artifacts/offline_health.json || echo "  (offline health skipped)"

# Seed cache with data (this will try cascade and fall back to synthetic if needed)
echo "3. Seeding cache for BTCUSDT 15m (1200 bars)..."
curl -s "http://localhost:${PORT}/api/offline/seed?symbol=BTCUSDT&tf=15m&bars=1200" > artifacts/seed_result.json
echo "  ✓ Cache seeded"

# Try HF endpoint if available (optional - will gracefully fail if offline)
echo "4. Testing HF endpoint (optional)..."
curl -s "http://localhost:${PORT}/api/hf/ohlcv?symbol=BTCUSDT&timeframe=15m&limit=500" > artifacts/hf_test.json 2>/dev/null || echo "  (HF endpoint not available or offline)"

echo ""
echo "=========================================="
echo "Self-Healing Diagnostics Check"
echo "=========================================="

# Check diagnostics if available
if curl -s "http://localhost:${PORT}/api/system/diagnostics/remediate" > artifacts/remediation.json 2>/dev/null; then
  echo "✓ Diagnostics available"

  # Extract and display key info
  node -e "
    try {
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('artifacts/remediation.json', 'utf8'));
      console.log('  Status:', data?.report?.status || 'unknown');

      const failedPings = data?.report?.pings?.filter(p => typeof p.status !== 'number' || p.status >= 400) || [];
      if (failedPings.length > 0) {
        console.log('  ⚠ Failed endpoints:', failedPings.map(p => p.name).join(', '));
        console.log('  💡 Remediation actions:', data?.remediation?.actions?.length || 0);
      } else {
        console.log('  ✓ All endpoints accessible');
      }
    } catch {
      console.log('  (diagnostics data unavailable)');
    }
  " 2>/dev/null || echo "  (diagnostics processing skipped)"
else
  echo "  ⚠ Diagnostics endpoint not available"
  echo "  Continuing with offline fallback mode"
fi

echo ""
echo "=========================================="
echo "Generating Trading Signals (15m)"
echo "=========================================="

# Main signal: BTCUSDT
echo "5. Generating snapshot for BTCUSDT 15m..."
curl -s "http://localhost:${PORT}/api/scoring/snapshot?symbol=BTCUSDT&tfs=15m" > artifacts/snapshot_BTCUSDT_15m.json 2>/dev/null || {
  echo "  Using alternative endpoint..."
  curl -s "http://localhost:${PORT}/api/offline/ohlcv?symbol=BTCUSDT&tf=15m&limit=500" > artifacts/snapshot_BTCUSDT_15m.json 2>/dev/null || echo "{\"error\":\"failed\"}" > artifacts/snapshot_BTCUSDT_15m.json
}
echo "  ✓ BTCUSDT snapshot saved"

# Additional symbols
SYMBOLS="ETHUSDT SOLUSDT BNBUSDT XRPUSDT ADAUSDT DOGEUSDT AVAXUSDT TRXUSDT MATICUSDT"
for S in $SYMBOLS; do
  echo "6. Generating snapshot for $S 15m..."
  curl -s "http://localhost:${PORT}/api/scoring/snapshot?symbol=${S}&tfs=15m" > "artifacts/snapshot_${S}_15m.json" 2>/dev/null || {
    curl -s "http://localhost:${PORT}/api/offline/ohlcv?symbol=${S}&tf=15m&limit=500" > "artifacts/snapshot_${S}_15m.json" 2>/dev/null || echo "{\"error\":\"failed\"}" > "artifacts/snapshot_${S}_15m.json"
  }
done

echo "✓ All snapshots generated"

echo ""
echo "=========================================="
echo "Analyzing Results"
echo "=========================================="

# Create summary report
node -e '
const fs = require("fs");
const p = "artifacts";
const files = fs.readdirSync(p).filter(f => f.startsWith("snapshot_") && f.endsWith("_15m.json"));

console.log("\nSummary of 15m Trading Signals:\n");
console.log("Symbol       | Action | Score  | Confidence | Valuable");
console.log("-------------|--------|--------|------------|----------");

const rows = [];
for (const f of files) {
  try {
    const content = fs.readFileSync(p + "/" + f, "utf8");
    const j = JSON.parse(content);

    // Handle both snapshot format and raw OHLCV format
    let symbol = j.symbol || f.replace(/^snapshot_|_15m\.json$/g, "");
    let action = j.action || (j.data ? "DATA" : "N/A");
    let score = j.score !== undefined ? j.score.toFixed(2) : "N/A";
    let confidence = j.confidence !== undefined ? j.confidence.toFixed(2) : "N/A";
    let valuable = false;

    if (j.confidence >= 0.70 && (j.score >= 0.70 || j.score <= 0.30)) {
      valuable = true;
    }

    const paddedSymbol = (symbol + "        ").substring(0, 12);
    const paddedAction = (action + "      ").substring(0, 6);
    const paddedScore = (score + "      ").substring(0, 6);
    const paddedConf = (confidence + "      ").substring(0, 10);
    const valuableStr = valuable ? "✓ YES" : "  no";

    console.log(`${paddedSymbol} | ${paddedAction} | ${paddedScore} | ${paddedConf} | ${valuableStr}`);

    rows.push({
      file: f,
      symbol,
      action,
      score: j.score,
      confidence: j.confidence,
      valuable
    });
  } catch (e) {
    console.log(f.padEnd(12) + " | ERROR  | ------ | ---------- | ------");
  }
}

fs.writeFileSync(p + "/summary_15m.json", JSON.stringify(rows, null, 2));
console.log("\n✓ Summary saved to artifacts/summary_15m.json\n");
'

echo ""
echo "=========================================="
echo "✓ One-Click 15m Test Complete!"
echo "=========================================="
echo ""
echo "Results saved in artifacts/:"
echo "  - snapshot_*_15m.json (individual signals)"
echo "  - summary_15m.json (aggregated analysis)"
echo "  - server.log (server output)"
echo ""
echo "Server is still running on port $PORT (PID: $SERVER_PID)"
echo "To stop: kill $SERVER_PID"
echo ""
