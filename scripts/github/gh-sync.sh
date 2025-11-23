#!/bin/bash
# GitHub CLI Script: Sync with GitHub
# Usage: ./scripts/github/gh-sync.sh [--push|--pull|--both]

set -e

source "$(dirname "$0")/common.sh"

ACTION="${1:---both}"

case $ACTION in
    --push)
        echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
        git push origin $(git branch --show-current)
        echo -e "${GREEN}✅ Pushed successfully!${NC}"
        ;;
    --pull)
        echo -e "${BLUE}📥 Pulling from GitHub...${NC}"
        git pull origin $(git branch --show-current)
        echo -e "${GREEN}✅ Pulled successfully!${NC}"
        ;;
    --both|*)
        echo -e "${BLUE}🔄 Syncing with GitHub...${NC}"
        CURRENT_BRANCH=$(git branch --show-current)
        echo "Pulling from $CURRENT_BRANCH..."
        git pull origin $CURRENT_BRANCH
        echo "Pushing to $CURRENT_BRANCH..."
        git push origin $CURRENT_BRANCH
        echo -e "${GREEN}✅ Sync complete!${NC}"
        ;;
esac

# Trigger GitHub Actions if on main/master
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    echo ""
    echo -e "${YELLOW}💡 Tip: GitHub Actions will automatically deploy${NC}"
fi
