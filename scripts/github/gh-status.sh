#!/bin/bash
# GitHub CLI Script: View Project Status
# Usage: ./scripts/github/gh-status.sh

set -e

source "$(dirname "$0")/common.sh"

echo -e "${BLUE}📊 Project Status${NC}"
echo ""

# Repository info
echo -e "${GREEN}Repository Information:${NC}"
gh repo view --json nameWithOwner,description,url,isPrivate,createdAt,updatedAt,pushedAt,defaultBranchRef \
    --jq '{name: .nameWithOwner, description: .description, url: .url, private: .isPrivate, created: .createdAt, updated: .updatedAt, pushed: .pushedAt, defaultBranch: .defaultBranchRef.name}'
echo ""

# Issues
echo -e "${GREEN}Issues:${NC}"
OPEN_ISSUES=$(gh issue list --state open --json number --jq 'length')
CLOSED_ISSUES=$(gh issue list --state closed --json number --jq 'length')
echo "  Open: $OPEN_ISSUES"
echo "  Closed: $CLOSED_ISSUES"
echo ""

# Pull Requests
echo -e "${GREEN}Pull Requests:${NC}"
OPEN_PR=$(gh pr list --state open --json number --jq 'length')
CLOSED_PR=$(gh pr list --state closed --json number --jq 'length')
echo "  Open: $OPEN_PR"
echo "  Closed: $CLOSED_PR"
echo ""

# Recent releases
echo -e "${GREEN}Recent Releases:${NC}"
gh release list --limit 5
echo ""

# Workflow runs
echo -e "${GREEN}Recent Workflow Runs:${NC}"
gh run list --limit 5
echo ""

# Actions status
echo -e "${GREEN}Actions Status:${NC}"
gh run list --workflow=deploy-pages.yml --limit 3 --json status,conclusion,name,createdAt \
    --jq '.[] | "\(.name): \(.status) - \(.conclusion // "in_progress")"'
echo ""
