#!/bin/bash

# Health Check Script for BOLT AI Trading System
# Usage: ./scripts/health-check.sh [BASE_URL]

set -e

# Configuration
BASE_URL="${1:-http://localhost:8001}"
TIMEOUT=10
EXIT_CODE=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP endpoint
check_http_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "204" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        return 1
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    response=$(curl -s --max-time $TIMEOUT "$BASE_URL$endpoint" || echo "")
    
    if [ -z "$response" ]; then
        echo -e "${RED}✗ FAILED${NC} (No response)"
        return 1
    fi
    
    if echo "$response" | jq -e . >/dev/null 2>&1; then
        status=$(echo "$response" | jq -r '.status // "unknown"')
        if [ "$status" = "healthy" ] || [ "$status" = "ok" ] || [ "$status" = "up" ]; then
            echo -e "${GREEN}✓ OK${NC} (Status: $status)"
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (Status: $status)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Invalid JSON)"
        return 1
    fi
}

# Function to check WebSocket connection
check_websocket() {
    echo -n "Checking WebSocket connection... "
    
    # Try to establish WebSocket connection (requires wscat or similar tool)
    if command -v wscat &> /dev/null; then
        timeout 5 wscat -c "ws://localhost:8001" --execute "ping" &> /dev/null && \
            echo -e "${GREEN}✓ OK${NC}" || \
            echo -e "${YELLOW}⚠ WARNING${NC} (Could not establish connection)"
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC} (wscat not installed)"
    fi
    
    return 0
}

# Function to check disk space
check_disk_space() {
    echo -n "Checking disk space... "
    
    if command -v df &> /dev/null; then
        available=$(df -h . | awk 'NR==2 {print $4}')
        usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
        
        if [ "$usage" -lt 90 ]; then
            echo -e "${GREEN}✓ OK${NC} ($available available, ${usage}% used)"
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (${usage}% used)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC} (df not available)"
        return 0
    fi
}

# Function to check memory usage
check_memory() {
    echo -n "Checking memory usage... "
    
    if command -v free &> /dev/null; then
        mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
        
        if [ "$mem_usage" -lt 90 ]; then
            echo -e "${GREEN}✓ OK${NC} (${mem_usage}% used)"
            return 0
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (${mem_usage}% used)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC} (free not available)"
        return 0
    fi
}

# Main health check execution
echo "========================================="
echo "BOLT AI Trading System - Health Check"
echo "========================================="
echo "Target: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Check main health endpoint
check_http_endpoint "/api/health" "Main health endpoint" || EXIT_CODE=1

# Check HuggingFace health endpoint
check_json_endpoint "/api/hf/health" "HuggingFace health" || EXIT_CODE=1

# Check metrics endpoint (if available)
check_http_endpoint "/metrics" "Metrics endpoint" || true

# Check WebSocket
check_websocket || true

# Check system resources
echo ""
echo "System Resources:"
check_disk_space || EXIT_CODE=1
check_memory || true

# Generate JSON output
echo ""
echo "========================================="
echo "JSON Output:"
echo "========================================="

cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "$BASE_URL",
  "status": $([ $EXIT_CODE -eq 0 ] && echo '"healthy"' || echo '"unhealthy"'),
  "checks": {
    "http_health": $(check_http_endpoint "/api/health" "Main health endpoint" &>/dev/null && echo "true" || echo "false"),
    "hf_health": $(check_json_endpoint "/api/hf/health" "HuggingFace health" &>/dev/null && echo "true" || echo "false"),
    "metrics": $(check_http_endpoint "/metrics" "Metrics endpoint" &>/dev/null && echo "true" || echo "false"),
    "disk_space": $(check_disk_space &>/dev/null && echo "true" || echo "false")
  }
}
EOF

echo ""
echo "========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed${NC}"
else
    echo -e "${RED}✗ Some health checks failed${NC}"
fi
echo "========================================="

exit $EXIT_CODE

