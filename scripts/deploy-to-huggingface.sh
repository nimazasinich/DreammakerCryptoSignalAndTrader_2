#!/bin/bash
# ============================================================================
# Hugging Face Spaces Deployment Script
# ============================================================================
# This script helps you prepare and deploy to Hugging Face Spaces
# Usage: bash scripts/deploy-to-huggingface.sh [SPACE_URL]
# Example: bash scripts/deploy-to-huggingface.sh https://huggingface.co/spaces/username/space-name
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with colors
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Print header
echo "============================================================================"
echo "🚀 Hugging Face Spaces Deployment Helper"
echo "============================================================================"
echo ""

# Check if Space URL is provided
if [ -z "$1" ]; then
    print_error "Please provide your Hugging Face Space URL"
    echo ""
    echo "Usage: bash scripts/deploy-to-huggingface.sh [SPACE_URL]"
    echo "Example: bash scripts/deploy-to-huggingface.sh https://huggingface.co/spaces/username/crypto-trader"
    echo ""
    exit 1
fi

SPACE_URL="$1"
print_info "Target Space: ${SPACE_URL}"
echo ""

# Extract username and space name from URL
if [[ $SPACE_URL =~ spaces/([^/]+)/([^/]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    SPACENAME="${BASH_REMATCH[2]}"
    print_success "Detected: Username=${USERNAME}, Space=${SPACENAME}"
else
    print_error "Invalid Space URL format"
    echo "Expected format: https://huggingface.co/spaces/USERNAME/SPACE_NAME"
    exit 1
fi
echo ""

# Step 1: Check prerequisites
print_info "Step 1: Checking prerequisites..."
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi
print_success "Git is installed"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi
print_success "Running from project root"

# Check if Dockerfile.huggingface exists
if [ ! -f "Dockerfile.huggingface" ]; then
    print_error "Dockerfile.huggingface not found"
    exit 1
fi
print_success "Dockerfile.huggingface found"
echo ""

# Step 2: Create temporary deployment directory
print_info "Step 2: Preparing deployment files..."
echo ""

DEPLOY_DIR="./huggingface-deploy-temp"
if [ -d "$DEPLOY_DIR" ]; then
    print_warning "Removing existing deployment directory..."
    rm -rf "$DEPLOY_DIR"
fi

mkdir -p "$DEPLOY_DIR"
print_success "Created deployment directory: ${DEPLOY_DIR}"

# Step 3: Clone or update Space repository
print_info "Step 3: Cloning Hugging Face Space..."
echo ""

cd "$DEPLOY_DIR"
if git clone "$SPACE_URL" space 2>/dev/null; then
    print_success "Space cloned successfully"
else
    print_error "Failed to clone Space. Please check:"
    echo "  1. The Space URL is correct"
    echo "  2. You have access to the Space"
    echo "  3. You are logged in to Hugging Face (git credential helper)"
    echo ""
    echo "To login, run: huggingface-cli login"
    cd ..
    rm -rf "$DEPLOY_DIR"
    exit 1
fi

cd space
print_success "Changed to Space directory"
echo ""

# Step 4: Copy project files
print_info "Step 4: Copying project files..."
echo ""

# Copy essential files
cp -r ../../src .
print_success "Copied src/"

cp -r ../../config .
print_success "Copied config/"

cp -r ../../data .
print_success "Copied data/"

cp -r ../../public .
print_success "Copied public/"

cp ../../package*.json .
print_success "Copied package.json"

cp ../../tsconfig*.json .
print_success "Copied tsconfig files"

cp ../../vite.config.ts .
print_success "Copied vite.config.ts"

cp ../../tailwind.config.js .
print_success "Copied tailwind.config.js"

cp ../../postcss.config.js . 2>/dev/null || true

# Copy Dockerfile
cp ../../Dockerfile.huggingface ./Dockerfile
print_success "Copied Dockerfile (from Dockerfile.huggingface)"

# Copy .dockerignore
cp ../../.dockerignore .
print_success "Copied .dockerignore"

# Copy documentation
cp ../../HUGGINGFACE_DEPLOYMENT.md ./README.md
print_success "Copied deployment guide as README.md"
echo ""

# Step 5: Create/update .env file (optional)
print_info "Step 5: Environment configuration..."
echo ""

if [ -f "../../.env.huggingface" ]; then
    print_warning "Found .env.huggingface - remember to set these as Repository Secrets"
    print_warning "DO NOT commit .env file with real API keys!"
    echo ""
    echo "To set secrets, go to:"
    echo "https://huggingface.co/spaces/${USERNAME}/${SPACENAME}/settings"
    echo ""
fi

# Step 6: Git add and commit
print_info "Step 6: Committing changes..."
echo ""

git add .

if git diff --staged --quiet; then
    print_warning "No changes to commit"
else
    git commit -m "Deploy to Hugging Face Spaces

- Add full project source code
- Configure for port 7860
- Optimize for Docker Spaces
- Include comprehensive documentation"
    print_success "Changes committed"
fi
echo ""

# Step 7: Push to Hugging Face
print_info "Step 7: Pushing to Hugging Face..."
echo ""

print_warning "About to push to: ${SPACE_URL}"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if git push; then
        print_success "Successfully pushed to Hugging Face!"
        echo ""
        print_info "Build Status: Check the 'Logs' tab in your Space"
        print_info "Space URL: https://huggingface.co/spaces/${USERNAME}/${SPACENAME}"
        print_info "App URL: https://${USERNAME}-${SPACENAME}.hf.space"
        echo ""
        print_warning "Build will take approximately 10-15 minutes"
        echo ""
        print_info "Next steps:"
        echo "  1. Go to your Space: https://huggingface.co/spaces/${USERNAME}/${SPACENAME}"
        echo "  2. Check the 'Logs' tab for build progress"
        echo "  3. Set environment variables in 'Settings' > 'Repository secrets'"
        echo "  4. Wait for build to complete"
        echo "  5. Access your app at: https://${USERNAME}-${SPACENAME}.hf.space"
    else
        print_error "Failed to push to Hugging Face"
        echo ""
        print_info "Possible issues:"
        echo "  1. Authentication failed - run: huggingface-cli login"
        echo "  2. No write access to the Space"
        echo "  3. Network issues"
        exit 1
    fi
else
    print_warning "Push cancelled"
fi
echo ""

# Cleanup
cd ../../..
print_info "Cleaning up temporary files..."
read -p "Remove deployment directory? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$DEPLOY_DIR"
    print_success "Cleanup complete"
else
    print_info "Deployment files preserved in: ${DEPLOY_DIR}"
fi

echo ""
print_success "Deployment process complete!"
echo ""
echo "============================================================================"
echo "📚 For more information, see: HUGGINGFACE_DEPLOYMENT.md"
echo "============================================================================"
