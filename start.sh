#!/bin/bash

# BOLT AI - Easy Local Startup Script
# This script ensures everything is set up correctly before starting

set -e  # Exit on error

echo "🚀 BOLT AI - Local Development Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version should be 18 or higher (current: $(node -v))"
else
    echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi
echo -e "${GREEN}✅ npm version: $(npm -v)${NC}"

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p data
mkdir -p config
mkdir -p logs
echo -e "${GREEN}✅ Directories ready${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from example..."
    cp env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Note: Redis is disabled by default. Edit .env if you want to enable it.${NC}"
fi

# Check if config/api.json exists
if [ ! -f config/api.json ]; then
    echo ""
    echo "📝 Creating config/api.json..."
    # The ConfigManager will create it automatically, but we ensure directory exists
    echo -e "${GREEN}✅ Config directory ready${NC}"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies (this may take a few minutes)..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo ""
    echo "📦 Checking for dependency updates..."
    npm install --prefer-offline --no-audit
fi

# Start the development server
echo ""
echo "🎯 Starting BOLT AI..."
echo ""
echo "===================================="
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3001"
echo "===================================="
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start both frontend and backend
npm run dev
