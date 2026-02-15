# MCP Server Setup Guide

## What is MCP?

The Model Context Protocol (MCP) server allows external AI systems (like OpenClaw) to connect to Claws Desktop and call tools remotely.

## How to Connect (OpenClaw)

### Step 1: Ensure Claws Desktop is running

The MCP server starts automatically when Claws Desktop launches. Look for this in the console:

```
[MCP] Registered 4 tools: read_git_log, read_file, get_memory_stats, run_claude_code
[MCP] Server started on http://127.0.0.1:3001
```

### Step 2: Get your Mac's IP address

```bash
ipconfig getifaddr en0
```

### Step 3: Add to OpenClaw config

Edit `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "claws-desktop": {
        "transport": "http",
        "url": "http://YOUR-MAC-IP:3001/mcp"
      }
    }
  }
}
```

Replace `YOUR-MAC-IP` with the IP from Step 2.

**Note:** For local testing, use `http://127.0.0.1:3001/mcp`

## Available Tools

| Tool | Description | Arguments |
|------|-------------|-----------|
| `read_git_log` | Get recent git commits | `limit` (number, default: 10) |
| `read_file` | Read a project file | `path` (string, relative path) |
| `get_memory_stats` | Get SQLite database stats | none |
| `run_claude_code` | Execute Claude Code (stub) | `prompt` (string) |

## Testing

### Run Test Script

```bash
cd claws-desktop
./scripts/test-mcp.sh
```

### Quick Test Commands

```bash
# Initialize MCP session
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List available tools
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call read_git_log
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_git_log","arguments":{"limit":5}}}'

# Call get_memory_stats
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_memory_stats","arguments":{}}}'

# Call read_file
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"package.json"}}}'
```

## Troubleshooting

### Port 3001 already in use

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### MCP server not starting

1. Check the console log in Claws Desktop (View > Toggle Developer Tools)
2. Look for `[MCP]` messages
3. Check for error messages

### Connection refused from remote machine

1. Ensure you're using the correct IP address
2. Check macOS Firewall settings (System Preferences > Security & Privacy > Firewall)
3. Try local connection first (127.0.0.1) to verify server is running

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Claws Desktop App                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  UI (React) │  │   SQLite    │  │   MCP Server        │  │
│  │             │  │   Memory    │  │   (port 3001)       │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└────────────────────────────────────────────────┼─────────────┘
                                                 │
                                                 │ HTTP
                                                 │
                                        ┌────────▼────────┐
                                        │    OpenClaw     │
                                        │  (remote AI)    │
                                        └─────────────────┘
```

---

*Created: 2026-02-15*
*Phase: 2 - MCP Bridge*
