#!/bin/bash
# Start Claws Desktop and test MCP server
# Double-click this file to run

cd "$(dirname "$0")"

echo "=========================================="
echo "  Claws Desktop - MCP Test Launcher"
echo "=========================================="
echo ""

# Kill any existing Electron processes
echo "Cleaning up any existing processes..."
pkill -f "Electron" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# Start the app in background
echo "Starting Claws Desktop..."
npm run electron:dev &
APP_PID=$!

# Wait for MCP server to start (look for log message)
echo "Waiting for MCP server to start..."
sleep 5

# Run the test script
echo ""
echo "Running MCP tests..."
echo ""
./scripts/test-mcp.sh

echo ""
echo "=========================================="
echo "  App is still running in background."
echo "  Close the app window when done."
echo "=========================================="
