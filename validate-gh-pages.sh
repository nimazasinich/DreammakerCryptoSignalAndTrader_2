#!/usr/bin/env bash
set -euo pipefail

REPO="nimazasinich/DreammakerCryptoSignalAndTrader"
WORKFLOW_NAME="Deploy Vite (or static) to GitHub Pages"
WORKFLOW_FILE=".github/workflows/gh-pages.yml"

pass(){ printf "✅ %s\n" "$1"; }
fail(){ printf "❌ %s\n" "$1"; exit 1; }
warn(){ printf "⚠️  %s\n" "$1"; }

# 0) sanity: tools
command -v gh >/dev/null || fail "GitHub CLI (gh) not found"
command -v curl >/dev/null || fail "curl not found"
command -v jq >/dev/null   || fail "jq not found"

# 1) repo exists + default branch
DEFAULT_BRANCH=$(gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name) || fail "Repo not accessible"
pass "Repo accessible (default branch: $DEFAULT_BRANCH)"

# 2) workflow file exists
gh api "repos/$REPO/contents/$WORKFLOW_FILE" >/dev/null || fail "Workflow file missing: $WORKFLOW_FILE"
pass "Workflow file found: $WORKFLOW_FILE"

# 3) required variables exist (even placeholder)
VARS_JSON=$(gh api "repos/$REPO/actions/variables?per_page=100")
API_BASE=$(echo "$VARS_JSON" | jq -r '.variables[]?|select(.name=="PAGES_VITE_API_BASE")|.value' || true)
WS_BASE=$(echo "$VARS_JSON" | jq -r '.variables[]?|select(.name=="PAGES_VITE_WS_BASE")|.value' || true)

[[ -n "${API_BASE:-}" && -n "${WS_BASE:-}" ]] || warn "Repo variables missing (PAGES_VITE_API_BASE / PAGES_VITE_WS_BASE). Build may still pass using placeholders."
if [[ -n "${API_BASE:-}" ]]; then pass "PAGES_VITE_API_BASE present: $API_BASE"; else warn "PAGES_VITE_API_BASE not set"; fi
if [[ -n "${WS_BASE:-}"  ]]; then pass "PAGES_VITE_WS_BASE present:  $WS_BASE";  else warn "PAGES_VITE_WS_BASE not set";  fi

# 4) ensure Pages uses GitHub Actions (not "Deploy from a branch")
PAGES_JSON=$(gh api "repos/$REPO/pages" 2>/dev/null || true)
HTML_URL=$(echo "$PAGES_JSON" | jq -r '.html_url // empty')
if [[ -n "$HTML_URL" ]]; then
  pass "Pages configured (url: $HTML_URL)"
else
  warn "Pages not configured yet. It will be provisioned after first successful deploy."
fi

# 5) trigger a build (optional if one already exists)
gh workflow run "$WORKFLOW_NAME" -R "$REPO" || warn "Could not dispatch workflow (maybe already running)"

# 6) wait for latest run to finish and check status
echo "⏳ Waiting for workflow to complete…"
for i in {1..40}; do
  RUN_JSON=$(gh run list -R "$REPO" --workflow "$WORKFLOW_NAME" --json status,conclusion,headBranch,displayTitle,htmlUrl -L 1 | jq '.[0]')
  STATUS=$(echo "$RUN_JSON" | jq -r '.status // empty')
  CONCL=$(echo "$RUN_JSON" | jq -r '.conclusion // empty')
  [[ "$STATUS" == "completed" ]] && break
  sleep 6
done

[[ "${CONCL:-}" == "success" ]] || fail "Workflow did not complete successfully (status: ${STATUS:-?}, conclusion: ${CONCL:-?})"
RUN_URL=$(echo "$RUN_JSON" | jq -r '.htmlUrl')
pass "Workflow succeeded: $RUN_URL"

# 7) resolve final Pages URL (after deploy)
if [[ -z "${HTML_URL:-}" ]]; then
  PAGES_JSON=$(gh api "repos/$REPO/pages" 2>/dev/null || true)
  HTML_URL=$(echo "$PAGES_JSON" | jq -r '.html_url // empty')
fi
[[ -n "${HTML_URL:-}" ]] || fail "Pages URL still not available"

# 8) basic site health checks
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HTML_URL")
[[ "$CODE" == "200" || "$CODE" == "301" || "$CODE" == "302" ]] || fail "Site not reachable (HTTP $CODE): $HTML_URL"
pass "Site reachable ($CODE): $HTML_URL"

HTML=$(curl -s "$HTML_URL")
echo "$HTML" | grep -q "/DreammakerCryptoSignalAndTrader/" && pass "Vite base path looks correct" || warn "Did not detect expected base path in HTML"

# try loading main JS asset
MAINJS=$(echo "$HTML" | grep -oE 'src="/DreammakerCryptoSignalAndTrader/[^"]+\.js"' | head -n1 | sed 's/src="//;s/"$//')
if [[ -n "$MAINJS" ]]; then
  CODE_ASSET=$(curl -s -o /dev/null -w "%{http_code}" "https://nimazasinich.github.io$MAINJS")
  [[ "$CODE_ASSET" == "200" ]] && pass "Main JS asset served (200)" || fail "Main JS asset failed (HTTP $CODE_ASSET)"
else
  warn "Could not auto-detect main JS asset. Manually verify in browser DevTools."
fi

# SPA 404 check
CODE_404=$(curl -s -o /dev/null -w "%{http_code}" "${HTML_URL}404.html")
[[ "$CODE_404" == "200" ]] && pass "404.html present (SPA refresh safe)" || warn "404.html not found—hash routing should still work, but refresh on deep links may 404."

echo "-----------------------------------------"
echo "✅ Verification finished for $REPO"
echo "Page: $HTML_URL"
