#!/bin/bash

# API Key Validation Script
# Tests all configured API keys to ensure they're valid

set -e

echo "================================================================================"
echo "🔑 API KEY VALIDATION SUITE"
echo "================================================================================"
echo ""

# Source .env file
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    exit 1
fi

# Export variables from .env
export $(grep -v '^#' .env | xargs)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test CoinGecko (No API key required)
echo "1️⃣  Testing CoinGecko API (no key required)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
if echo "$RESPONSE" | grep -q "bitcoin"; then
    echo -e "${GREEN}✅ PASSED${NC} - CoinGecko API working"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAILED${NC} - CoinGecko API unavailable"
    echo "   Response: $RESPONSE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test Fear & Greed Index (No API key required)
echo "2️⃣  Testing Fear & Greed Index API (no key required)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "https://api.alternative.me/fng/")
if echo "$RESPONSE" | grep -q "value"; then
    echo -e "${GREEN}✅ PASSED${NC} - Fear & Greed API working"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAILED${NC} - Fear & Greed API unavailable"
    echo "   Response: $RESPONSE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test NewsAPI
echo "3️⃣  Testing NewsAPI (requires key)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$NEWS_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - NEWS_API_KEY not set"
else
    RESPONSE=$(curl -s "https://newsapi.org/v2/everything?q=bitcoin&pageSize=1&apiKey=$NEWS_API_KEY")
    if echo "$RESPONSE" | grep -q "\"status\":\"ok\""; then
        echo -e "${GREEN}✅ PASSED${NC} - NewsAPI key valid"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - NewsAPI key invalid or rate limited"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Test CoinMarketCap
echo "4️⃣  Testing CoinMarketCap API (requires key)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$CMC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - CMC_API_KEY not set"
else
    RESPONSE=$(curl -s -H "X-CMC_PRO_API_KEY: $CMC_API_KEY" \
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC")
    if echo "$RESPONSE" | grep -q "\"BTC\""; then
        echo -e "${GREEN}✅ PASSED${NC} - CoinMarketCap key valid"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - CoinMarketCap key invalid"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Test CryptoCompare
echo "5️⃣  Testing CryptoCompare API (requires key)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$CRYPTOCOMPARE_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - CRYPTOCOMPARE_KEY not set"
else
    RESPONSE=$(curl -s -H "authorization: Apikey $CRYPTOCOMPARE_KEY" \
        "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD")
    if echo "$RESPONSE" | grep -q "USD"; then
        echo -e "${GREEN}✅ PASSED${NC} - CryptoCompare key valid"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - CryptoCompare key invalid"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Test Etherscan (V2 API with chainid)
echo "6️⃣  Testing Etherscan API V2 (requires key)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - ETHERSCAN_API_KEY not set"
else
    RESPONSE=$(curl -s "https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey=$ETHERSCAN_API_KEY")
    if echo "$RESPONSE" | grep -q "\"status\":\"1\""; then
        echo -e "${GREEN}✅ PASSED${NC} - Etherscan key valid (V2 API)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - Etherscan key invalid"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Test BscScan (V2 API with chainid)
echo "7️⃣  Testing BscScan API V2 (requires key)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$BSCSCAN_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - BSCSCAN_API_KEY not set"
else
    RESPONSE=$(curl -s "https://api.bscscan.com/v2/api?chainid=56&module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey=$BSCSCAN_API_KEY")
    if echo "$RESPONSE" | grep -q "\"status\":\"1\""; then
        echo -e "${GREEN}✅ PASSED${NC} - BscScan key valid (V2 API)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - BscScan key invalid"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Test HuggingFace (optional)
echo "8️⃣  Testing HuggingFace API (optional)..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -z "$HUGGINGFACE_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - HUGGINGFACE_API_KEY not set (optional)"
    echo "   Note: HuggingFace works without API key but with lower rate limits"
else
    RESPONSE=$(curl -s -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
        "https://huggingface.co/api/whoami")
    if echo "$RESPONSE" | grep -q "name"; then
        echo -e "${GREEN}✅ PASSED${NC} - HuggingFace key valid"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC} - HuggingFace key invalid"
        echo "   Response: $RESPONSE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi
echo ""

# Check KuCoin Futures (just check if placeholder)
echo "9️⃣  Checking KuCoin Futures Configuration..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ "$KUCOIN_FUTURES_KEY" = "your_key" ] || [ -z "$KUCOIN_FUTURES_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING${NC} - KuCoin Futures credentials are placeholders"
    echo "   Futures trading will not work until you configure:"
    echo "   - KUCOIN_FUTURES_KEY"
    echo "   - KUCOIN_FUTURES_SECRET"
    echo "   - KUCOIN_FUTURES_PASSPHRASE"
    echo "   Get credentials from: https://www.kucoin.com/account/api"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}✅ CONFIGURED${NC} - KuCoin Futures credentials set"
    echo "   Note: Cannot validate without live request (security)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Summary
echo "================================================================================"
echo "📊 VALIDATION SUMMARY"
echo "================================================================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "✅ Passed: ${GREEN}$PASSED_TESTS${NC} ($((PASSED_TESTS * 100 / TOTAL_TESTS))%)"
echo -e "❌ Failed: ${RED}$FAILED_TESTS${NC} ($((FAILED_TESTS * 100 / TOTAL_TESTS))%)"
echo ""

# Critical APIs check
CRITICAL_APIS=("CoinGecko" "Fear & Greed")
echo "🔥 CRITICAL APIs (required for basic functionality):"
echo "   ✅ CoinGecko - Price data"
echo "   ✅ Fear & Greed - Sentiment data"
echo ""

# Required APIs for full features
echo "⚠️  REQUIRED APIs (for full feature set):"
if [ -z "$NEWS_API_KEY" ]; then
    echo "   ❌ NewsAPI - Get key from: https://newsapi.org/"
else
    echo "   ✅ NewsAPI"
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "   ❌ Etherscan - Get key from: https://etherscan.io/apis"
else
    echo "   ✅ Etherscan"
fi

if [ -z "$BSCSCAN_API_KEY" ]; then
    echo "   ❌ BscScan - Get key from: https://bscscan.com/apis"
else
    echo "   ✅ BscScan"
fi
echo ""

# Optional APIs
echo "ℹ️  OPTIONAL APIs (for enhanced features):"
echo "   - CMC_API_KEY: Premium market data"
echo "   - CRYPTOCOMPARE_KEY: Fallback price source"
echo "   - HUGGINGFACE_API_KEY: Higher NLP rate limits"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}⚠️  Some API validations failed. Review errors above.${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 All configured APIs are valid!${NC}"
    exit 0
fi
