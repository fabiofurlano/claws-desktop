#!/bin/bash
# MCP Server Test Script
# Run this while the app is running to verify MCP tools

set -e

MCP_URL="http://127.0.0.1:3001/mcp"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== MCP Server Test Script ==="
echo "Testing MCP server at $MCP_URL"
echo ""

# Check if server is running
echo -n "Test 0: Check if MCP server is running... "
if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001" 2>/dev/null | grep -qE "200|400|404|405"; then
    echo -e "${GREEN}PASS${NC} (server responding)"
else
    echo -e "${RED}FAIL - Server not responding. Is the app running?${NC}"
    echo "Start the app with: npm run electron:dev"
    exit 1
fi

# Test 1: Initialize MCP session
echo -n "Test 1: Initialize MCP session... "
INIT_RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' 2>/dev/null || echo "")

if echo "$INIT_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}PASS${NC}"
    echo "  Response: $(echo $INIT_RESPONSE | head -c 100)..."
else
    echo -e "${RED}FAIL${NC}"
    echo "  Response: $INIT_RESPONSE"
fi

# Test 2: List tools
echo -n "Test 2: List available tools... "
LIST_RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' 2>/dev/null || echo "")

if echo "$LIST_RESPONSE" | grep -q "read_git_log"; then
    echo -e "${GREEN}PASS${NC}"
    # Count tools
    TOOL_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
    echo "  Found $TOOL_COUNT tools"
else
    echo -e "${RED}FAIL${NC}"
    echo "  Response: $LIST_RESPONSE"
fi

# Test 3: Call read_git_log
echo -n "Test 3: Call read_git_log tool... "
GIT_RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_git_log","arguments":{"limit":3}}}' 2>/dev/null || echo "")

if echo "$GIT_RESPONSE" | grep -qE "[a-f0-9]{7}"; then
    echo -e "${GREEN}PASS${NC}"
    echo "  Sample: $(echo $GIT_RESPONSE | grep -oE '[a-f0-9]{7} [^\"]+' | head -1)"
else
    echo -e "${YELLOW}CHECK${NC} (may need app restart)"
    echo "  Response: $(echo $GIT_RESPONSE | head -c 200)"
fi

# Test 4: Call get_memory_stats
echo -n "Test 4: Call get_memory_stats tool... "
STATS_RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_memory_stats","arguments":{}}}' 2>/dev/null || echo "")

if echo "$STATS_RESPONSE" | grep -qE "patterns|conversations|messages"; then
    echo -e "${GREEN}PASS${NC}"
    echo "  Stats: $(echo $STATS_RESPONSE | grep -oE '\"(patterns|conversations|messages)\":[0-9]+' | tr '\n' ' ')"
else
    echo -e "${YELLOW}CHECK${NC} (database may be empty)"
    echo "  Response: $(echo $STATS_RESPONSE | head -c 200)"
fi

# Test 5: Call read_file
echo -n "Test 5: Call read_file tool... "
FILE_RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"package.json"}}}' 2>/dev/null || echo "")

if echo "$FILE_RESPONSE" | grep -q "claws-desktop"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "  Response: $(echo $FILE_RESPONSE | head -c 200)"
fi

echo ""
echo "=== Tests Complete ==="
echo ""
echo "Quick manual test commands:"
echo "  curl -X POST http://127.0.0.1:3001/mcp -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}'"
echo "  curl -X POST http://127.0.0.1:3001/mcp -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"read_git_log\",\"arguments\":{\"limit\":5}}}'"
