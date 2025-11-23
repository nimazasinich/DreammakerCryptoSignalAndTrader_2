#!/bin/bash
# GitHub CLI Script: Create Issue
# Usage: ./scripts/github/gh-issue.sh [title] [--bug|--feature|--enhancement]

set -e

source "$(dirname "$0")/common.sh"

TITLE="$1"
LABEL=""

# Parse flags
for arg in "$@"; do
    case $arg in
        --bug) LABEL="bug" ;;
        --feature) LABEL="enhancement" ;;
        --enhancement) LABEL="enhancement" ;;
    esac
done

if [ -z "$TITLE" ]; then
    read -p "Issue title: " TITLE
fi

BODY=""
if [ -f ".github/ISSUE_TEMPLATE/${LABEL:-bug}.md" ]; then
    BODY=$(cat ".github/ISSUE_TEMPLATE/${LABEL:-bug}.md")
fi

FLAGS=""
[ -n "$LABEL" ] && FLAGS="$FLAGS --label $LABEL"

gh issue create --title "$TITLE" --body "$BODY" $FLAGS

echo -e "${GREEN}✅ Issue created successfully!${NC}"
