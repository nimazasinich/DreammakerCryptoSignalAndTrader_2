#!/bin/bash
# GitHub CLI Script: Setup GitHub Repository
# Usage: ./scripts/github/gh-setup.sh

set -e

source "$(dirname "$0")/common.sh"

echo -e "${BLUE}🔧 Setting up GitHub Repository${NC}"
echo ""

# Enable GitHub Pages
echo -e "${YELLOW}Enabling GitHub Pages...${NC}"
gh api repos/:owner/:repo/pages \
    -X POST \
    -f source='{"branch":"gh-pages","path":"/root"}' \
    || echo "Pages may already be configured"
echo ""

# Enable GitHub Discussions
echo -e "${YELLOW}Enabling GitHub Discussions...${NC}"
gh api repos/:owner/:repo -X PATCH -f has_discussions=true || echo "Discussions may already be enabled"
echo ""

# Enable GitHub Projects
echo -e "${YELLOW}Setting up GitHub Projects...${NC}"
echo "Creating project..."
PROJECT_ID=$(gh api repos/:owner/:repo/projects --jq '.[0].id' 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    gh project create --title "BOLT AI Development" --body "Project management for BOLT AI"
    echo -e "${GREEN}✅ Project created${NC}"
else
    echo -e "${GREEN}✅ Project already exists${NC}"
fi
echo ""

# Enable Dependabot
echo -e "${YELLOW}Enabling Dependabot...${NC}"
if [ -f ".github/dependabot.yml" ]; then
    echo -e "${GREEN}✅ Dependabot already configured${NC}"
else
    echo "Creating Dependabot configuration..."
    # Will be created by dependabot.yml file
fi
echo ""

# Enable GitHub Actions
echo -e "${YELLOW}GitHub Actions Status:${NC}"
gh workflow list
echo ""

# Set repository topics
echo -e "${YELLOW}Setting repository topics...${NC}"
gh repo edit --add-topic "cryptocurrency" --add-topic "ai" --add-topic "trading" --add-topic "neural-network" --add-topic "react" --add-topic "typescript" --add-topic "vite"
echo ""

echo -e "${GREEN}✅ GitHub repository setup complete!${NC}"
echo ""
echo "View your repository:"
gh repo view --web
