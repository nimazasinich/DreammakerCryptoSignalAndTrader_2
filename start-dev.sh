#!/bin/bash

echo ""
echo "=========================================="
echo "   BOLT AI Development Server"
echo "=========================================="
echo ""
echo "Starting frontend and backend servers..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start both servers using concurrently
npm run dev

