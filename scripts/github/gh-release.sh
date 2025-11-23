#!/bin/bash
# GitHub CLI Script: Create Release
# Usage: ./scripts/github/gh-release.sh [version] [--draft] [--prerelease]

set -e

source "$(dirname "$0")/common.sh"

VERSION=${1:-$(node -p "require('../package.json').version")}
DRAFT=false
PRERELEASE=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --draft) DRAFT=true ;;
        --prerelease) PRERELEASE=true ;;
    esac
done

echo -e "${BLUE}🚀 Creating GitHub Release: v$VERSION${NC}"
echo ""

# Get changelog or generate notes
if [ -f "CHANGELOG.md" ]; then
    NOTES=$(awk "/^## \[$VERSION\]/,/^## \[/" CHANGELOG.md | head -n -1)
else
    NOTES="Release v$VERSION - See commit history for changes"
fi

# Create release
FLAGS=""
[ "$DRAFT" = true ] && FLAGS="$FLAGS --draft"
[ "$PRERELEASE" = true ] && FLAGS="$FLAGS --prerelease"

gh release create "v$VERSION" \
    --title "v$VERSION" \
    --notes "$NOTES" \
    $FLAGS

echo -e "${GREEN}✅ Release created successfully!${NC}"
gh release view "v$VERSION" --web
