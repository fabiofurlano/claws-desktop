#!/bin/bash
# Test Composio MCP Integration
# Run this after starting the app with: npm run electron:dev

set -e

echo "========================================"
echo "Testing Composio MCP Integration"
echo "========================================"
echo ""

MCP_URL="http://127.0.0.1:3001/mcp"
HEADERS="Content-Type: application/json"

# Test 1: List tools (should include composio_* if configured)
echo "1. Testing list_tools (MCP server running)..."
RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "$HEADERS" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

if echo "$RESPONSE" | grep -q '"tools"'; then
    echo "   [PASS] Tools listed"
    # Count tools
    TOOL_COUNT=$(echo "$RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
    echo "   Found $TOOL_COUNT tools"
else
    echo "   [FAIL] No tools found"
    echo "$RESPONSE"
fi
echo ""

# Test 2: Check for Composio tools (will only work if connected)
echo "2. Checking for Composio tools..."
if echo "$RESPONSE" | grep -q 'composio_'; then
    echo "   [PASS] Composio tools registered"
    echo "$RESPONSE" | grep -o 'composio_[a-z_]*' | sort -u | head -5
else
    echo "   [SKIP] No Composio tools (not configured yet)"
    echo "   Add a Composio connection in Settings > MCP to enable tools"
fi
echo ""

# Test 3: Verify database tables exist
echo "3. Testing database schema..."
DB_PATH="$HOME/Library/Application Support/Claws/claws_memory.db"

if [ -f "$DB_PATH" ]; then
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    if echo "$TABLES" | grep -q 'mcp_connections'; then
        echo "   [PASS] mcp_connections table exists"
    else
        echo "   [FAIL] mcp_connections table missing"
    fi
    if echo "$TABLES" | grep -q 'connected_tools'; then
        echo "   [PASS] connected_tools table exists"
    else
        echo "   [FAIL] connected_tools table missing"
    fi

    # Show connection count
    CONN_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM mcp_connections" 2>/dev/null || echo "0")
    echo "   Connections in database: $CONN_COUNT"
else
    echo "   [SKIP] Database not found (app not run yet)"
    echo "   Expected path: $DB_PATH"
fi
echo ""

# Test 4: Check MCP server is accessible
echo "4. Testing MCP server accessibility..."
if curl -s --max-time 2 "$MCP_URL" > /dev/null 2>&1; then
    echo "   [PASS] MCP server responding"
else
    echo "   [FAIL] MCP server not responding"
    echo "   Make sure the app is running: npm run electron:dev"
fi
echo ""

echo "========================================"
echo "Test Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open Settings > MCP in the app"
echo "2. Add your Composio API key"
echo "3. Run this test again to see connected tools"
echo ""
echo "Get API key from: https://app.composio.dev"
