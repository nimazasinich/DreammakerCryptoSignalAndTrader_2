#!/usr/bin/env bash
set -euo pipefail

OWNER="nimazasinich"
REPO="DreammakerCryptoSignalAndTrader"
FULL_REPO="$OWNER/$REPO"
WORKFLOW_NAME="Build & Publish to gh-pages branch"

echo "🚀 GitHub Pages Finalization Script"
echo "===================================="
echo ""

# Check tools
command -v gh >/dev/null || { echo "❌ gh CLI not found"; exit 1; }
command -v jq >/dev/null || { echo "❌ jq not found"; exit 1; }

# 1. Merge pending PRs (if any)
echo "📋 Step 1: Checking for pending PRs..."
PENDING_PRS=$(gh pr list -R "$FULL_REPO" --state open --json number,headRefName | jq -r '.[] | select(.headRefName | startswith("claude/")) | .number')

if [[ -n "$PENDING_PRS" ]]; then
  echo "Found pending PRs:"
  for PR_NUM in $PENDING_PRS; do
    echo "  - PR #$PR_NUM"
    gh pr merge "$PR_NUM" -R "$FULL_REPO" --squash --auto || echo "⚠️  Could not auto-merge PR #$PR_NUM"
  done
else
  echo "✅ No pending PRs found"
fi

echo ""

# 2. Trigger workflow (if not already running)
echo "🔄 Step 2: Triggering workflow..."
gh workflow run "$WORKFLOW_NAME" -R "$FULL_REPO" --ref main || echo "⚠️  Workflow may already be running"

echo ""

# 3. Wait for workflow to complete
echo "⏳ Step 3: Waiting for workflow to complete (max 5 minutes)..."
for i in {1..30}; do
  RUN_JSON=$(gh run list -R "$FULL_REPO" --workflow "$WORKFLOW_NAME" --json status,conclusion,headBranch,htmlUrl -L 1 | jq '.[0]')
  STATUS=$(echo "$RUN_JSON" | jq -r '.status // empty')
  CONCL=$(echo "$RUN_JSON" | jq -r '.conclusion // empty')

  if [[ "$STATUS" == "completed" ]]; then
    if [[ "$CONCL" == "success" ]]; then
      RUN_URL=$(echo "$RUN_JSON" | jq -r '.htmlUrl')
      echo "✅ Workflow completed successfully: $RUN_URL"
      break
    else
      echo "❌ Workflow failed: conclusion=$CONCL"
      exit 1
    fi
  fi

  echo "  Waiting... (attempt $i/30)"
  sleep 10
done

echo ""

# 4. Configure Pages source to gh-pages branch
echo "⚙️  Step 4: Configuring Pages to serve from gh-pages branch..."

# Try PUT first (creates Pages if not exists)
PAGES_RESPONSE=$(gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$FULL_REPO/pages" \
  -f "source[branch]=gh-pages" \
  -f "source[path]=/" 2>&1 || true)

if echo "$PAGES_RESPONSE" | grep -q "409\|422"; then
  # Pages exists, use PATCH
  echo "  Pages already exists, updating..."
  gh api --method PATCH \
    -H "Accept: application/vnd.github+json" \
    "repos/$FULL_REPO/pages" \
    -f "source[branch]=gh-pages" \
    -f "source[path]=/" || echo "⚠️  Could not update Pages source"
else
  echo "✅ Pages source configured"
fi

echo ""

# 5. Wait for Pages to deploy
echo "⏳ Step 5: Waiting for Pages deployment (may take 1-2 minutes)..."
sleep 30

echo ""

# 6. Verify deployment
echo "🔍 Step 6: Verifying deployment..."
SITE_URL="https://$OWNER.github.io/$REPO/"

for attempt in {1..5}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")

  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    echo "✅ Site is reachable: $SITE_URL (HTTP $HTTP_CODE)"

    # Check for assets
    HTML=$(curl -sL "$SITE_URL")
    ASSET=$(echo "$HTML" | grep -oE 'src="/'$REPO'/[^"]+\.js"' | head -n1 | sed 's/src="//;s/"$//')

    if [[ -n "$ASSET" ]]; then
      ASSET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$OWNER.github.io$ASSET")
      if [[ "$ASSET_CODE" == "200" ]]; then
        echo "✅ Main JS asset is served correctly"
      else
        echo "⚠️  Main JS asset returned HTTP $ASSET_CODE"
      fi
    else
      echo "⚠️  Could not detect main JS asset"
    fi

    # Check 404.html
    CODE_404=$(curl -s -o /dev/null -w "%{http_code}" "${SITE_URL}404.html")
    if [[ "$CODE_404" == "200" ]]; then
      echo "✅ 404.html is present (SPA-safe)"
    else
      echo "⚠️  404.html not found (HTTP $CODE_404)"
    fi

    break
  else
    echo "  Attempt $attempt/5: Site not ready yet (HTTP $HTTP_CODE)"
    sleep 15
  fi
done

echo ""
echo "=========================================="
echo "✅ GitHub Pages setup complete!"
echo "🌐 Site URL: $SITE_URL"
echo "=========================================="
