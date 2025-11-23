#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DreammakerCryptoSignalAndTrader - Local Testing Suite       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to run test
run_test() {
    local desc="$1"
    local cmd="$2"
    echo -e "${YELLOW}Testing:${NC} $desc"
    echo -e "${BLUE}Command:${NC} $cmd"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo ""
}

# Change to repo root (assuming script is in deploy/)
cd "$(dirname "$0")/.."

# 1. Build and Start
print_section "1. BUILD & START SERVICES"
echo "Stopping any existing containers..."
docker compose -f deploy/docker-compose.prod.yml down 2>/dev/null || true

echo "Building and starting services..."
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "Waiting for services to be healthy..."
sleep 10

print_section "2. CONTAINER STATUS"
docker compose -f deploy/docker-compose.prod.yml ps

# 2. Basic Sanity Checks
print_section "3. BASIC SANITY CHECKS"
run_test "Nginx root (200 OK)" \
    "curl -sI http://localhost | grep -q '200 OK'"

run_test "Health endpoint (via Nginx)" \
    "curl -s http://localhost/status/health | grep -q 'ok'"

run_test "System status endpoint" \
    "curl -s http://localhost/api/system/status | jq . | head -5"

# 3. HuggingFace Proxied Endpoints
print_section "4. HUGGINGFACE API ENDPOINTS"
run_test "HF OHLCV endpoint (BTCUSDT 1h)" \
    "curl -s 'http://localhost/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=120' | jq -e '.data | length > 0' >/dev/null"

run_test "HF Sentiment endpoint" \
    "curl -s -X POST 'http://localhost/api/hf/sentiment' -H 'content-type: application/json' -d '{\"texts\":[\"BTC to the moon\",\"ETH looks weak\"]}' | jq -e '.results | length == 2' >/dev/null"

# 4. Metrics
print_section "5. METRICS ENDPOINT (Direct)"
run_test "Prometheus metrics" \
    "curl -s http://localhost:8000/metrics | grep -q 'nodejs_version_info'"

# 5. Redis Tests
print_section "6. REDIS CONNECTIVITY"
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep redis | head -1)
if [ -n "$REDIS_CONTAINER" ]; then
    run_test "Redis PING" \
        "docker exec $REDIS_CONTAINER redis-cli ping | grep -q 'PONG'"

    echo -e "${YELLOW}Testing cache effect (2 identical API calls):${NC}"
    echo -n "First call (cold): "
    time curl -s "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=600" > /dev/null 2>&1
    echo -n "Second call (cached): "
    time curl -s "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=600" > /dev/null 2>&1
    echo ""
else
    echo -e "${RED}No Redis container found${NC}"
fi

# 6. WebSocket Test
print_section "7. WEBSOCKET CONNECTION"
echo -e "${YELLOW}Testing WebSocket endpoint...${NC}"
if command -v websocat &> /dev/null; then
    echo "test message" | timeout 5 websocat ws://localhost/ws 2>&1 | head -5 || echo "WebSocket test completed (or timed out)"
elif command -v wscat &> /dev/null; then
    echo "test message" | timeout 5 wscat -c ws://localhost/ws 2>&1 | head -5 || echo "WebSocket test completed (or timed out)"
else
    echo -e "${YELLOW}⚠ Install websocat or wscat for WS testing:${NC}"
    echo "  npm install -g wscat"
    echo "  # or"
    echo "  cargo install websocat"
fi
echo ""

# 7. Health Checks
print_section "8. DOCKER HEALTHCHECK STATUS"
docker compose -f deploy/docker-compose.prod.yml ps | grep -E "(healthy|unhealthy|starting)"

# 8. Port Conflicts Check
print_section "9. PORT USAGE"
echo -e "${YELLOW}Port 80:${NC}"
lsof -i :80 -sTCP:LISTEN 2>/dev/null || ss -lntp 2>/dev/null | grep ':80 ' || echo "Not in use"
echo ""
echo -e "${YELLOW}Port 8000:${NC}"
lsof -i :8000 -sTCP:LISTEN 2>/dev/null || ss -lntp 2>/dev/null | grep ':8000 ' || echo "Not in use"
echo ""
echo -e "${YELLOW}Port 6379 (Redis):${NC}"
lsof -i :6379 -sTCP:LISTEN 2>/dev/null || ss -lntp 2>/dev/null | grep ':6379 ' || echo "Not in use"

# 9. Recent Logs
print_section "10. RECENT LOGS (Last 30 lines)"
docker compose -f deploy/docker-compose.prod.yml logs --tail=30

# Summary
print_section "✓ TEST SUITE COMPLETE"
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • View logs:     docker compose -f deploy/docker-compose.prod.yml logs -f"
echo "  • Stop services: docker compose -f deploy/docker-compose.prod.yml down"
echo "  • Restart:       docker compose -f deploy/docker-compose.prod.yml restart"
echo ""
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
