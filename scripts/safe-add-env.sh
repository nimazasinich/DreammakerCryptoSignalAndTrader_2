#!/bin/bash
# scripts/safe-add-env.sh
# افزودن ایمن متغیرهای محیطی به .env.example بدون حذف موجود

set -e

ENV_FILE="${1:-.env.example}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ File not found: $ENV_FILE"
  exit 1
fi

# تابع افزودن اگر موجود نباشد
add_if_missing() {
  local key="$1"
  local value="$2"
  local comment="$3"

  # بررسی اینکه کلید موجود نیست (نه به صورت commented نه uncommented)
  if ! grep -q "^${key}=" "$ENV_FILE" && ! grep -q "^# ${key}=" "$ENV_FILE"; then
    echo "➕ Adding: $key"

    # اگر کامنت داده شده، اضافه کن
    if [[ -n "$comment" ]]; then
      echo "" >> "$ENV_FILE"
      echo "# $comment" >> "$ENV_FILE"
    fi

    printf "%s=%s\n" "$key" "$value" >> "$ENV_FILE"
    return 0
  else
    echo "⏭️  Skipped (exists): $key"
    return 1
  fi
}

echo ""
echo "🔄 Starting safe additive merge for $ENV_FILE..."
echo ""

# Backup
BACKUP="${ENV_FILE}.backup-$(date +%s)"
cp "$ENV_FILE" "$BACKUP"
echo "💾 Backup created: $BACKUP"
echo ""

ADDED=0

# ────────────────────────────────────────────────────────────────────────────
# Optional Market Data APIs
# ────────────────────────────────────────────────────────────────────────────

# NewsAPI
if add_if_missing "NEWS_API_KEY" "968a5e25552b4cb5ba3280361d8444ab" "NewsAPI Key (100 requests/day free) - https://newsapi.org/"; then
  ((ADDED++))
fi

# CoinMarketCap
if add_if_missing "CMC_API_KEY" "04cf4b5b-9868-465c-8ba0-9f2e78c92eb1" "CoinMarketCap API Key - https://coinmarketcap.com/api/"; then
  ((ADDED++))
fi

# CryptoCompare
if add_if_missing "CRYPTOCOMPARE_KEY" "e79c8e6d4c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f" "CryptoCompare API Key - https://min-api.cryptocompare.com/"; then
  ((ADDED++))
fi

# Santiment
if add_if_missing "SANTIMENT_KEY" "" "Santiment API Key (optional) - https://app.santiment.net/"; then
  ((ADDED++))
fi

# Whale Alert
if add_if_missing "WHALE_ALERT_KEY" "" "Whale Alert API Key (optional) - https://whale-alert.io/"; then
  ((ADDED++))
fi

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────

echo ""
echo "✅ Safe additive merge completed!"
echo "   Added: $ADDED new keys"
echo "   No existing keys were modified or removed"
echo ""
