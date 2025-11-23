#!/bin/bash
# GitHub CLI Script: Create Pull Request
# Usage: ./scripts/github/gh-pr.sh [title] [base-branch]

set -e

source "$(dirname "$0")/common.sh"

TITLE="$1"
BASE="${2:-main}"
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$TITLE" ]; then
    read -p "PR title: " TITLE
fi

BODY=""
if [ -f ".github/PULL_REQUEST_TEMPLATE.md" ]; then
    BODY=$(cat ".github/PULL_REQUEST_TEMPLATE.md")
fi

echo -e "${BLUE}📝 Creating Pull Request${NC}"
echo "From: $CURRENT_BRANCH → To: $BASE"
echo ""

gh pr create \
    --title "$TITLE" \
    --base "$BASE" \
    --body "$BODY" \
    --web

echo -e "${GREEN}✅ Pull Request created successfully!${NC}"
