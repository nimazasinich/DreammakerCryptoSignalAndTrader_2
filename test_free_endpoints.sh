#!/usr/bin/env bash
# test_free_endpoints.sh
# Test script for free external APIs and local backend endpoints
# Usage: ./test_free_endpoints.sh [API_BASE_URL]
# Example: ./test_free_endpoints.sh http://localhost:8000/api

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default API base or use first argument
API_BASE="${1:-http://localhost:8001/api}"
export API_BASE

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Free Resources Self-Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "API Base: ${GREEN}${API_BASE}${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Error: Node.js version 18+ is required${NC}"
    echo "Current version: $(node -v)"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo ""

# Check if backend is running (optional warning)
if ! curl -s -f "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Backend does not appear to be running at ${API_BASE}${NC}"
    echo -e "${YELLOW}   Make sure to start the backend server first:${NC}"
    echo -e "${YELLOW}   npm run dev${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run the test
echo -e "${BLUE}Running tests...${NC}"
echo ""

node free_resources_selftest.mjs

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
elif [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Some required endpoints failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${YELLOW}Check the report in artifacts/ for details${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Test execution failed!${NC}"
    echo -e "${RED}========================================${NC}"
fi

exit $EXIT_CODE

