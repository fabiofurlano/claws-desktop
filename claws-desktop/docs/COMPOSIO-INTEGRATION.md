# Composio Integration Guide

## Overview

Claws Desktop integrates with [Composio](https://composio.dev) to provide access to 250+ pre-built toolkits including:

- **GitHub** - Issues, PRs, repos, workflows
- **Slack** - Messages, channels, users
- **Gmail** - Send/receive emails
- **Google Calendar** - Events, scheduling
- **Notion** - Pages, databases
- **Linear, Jira, Asana** - Project management
- **And 250+ more...**

## Setup

### 1. Get Composio API Key

1. Go to [app.composio.dev](https://app.composio.dev)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

### 2. Add Connection in Claws

1. Open Claws Desktop
2. Go to **Settings** → **MCP** tab
3. Click **+ Add Connection**
4. Enter a name (e.g., "My Composio")
5. Paste your API key
6. Click **Add Connection**

### 3. Connection Status

- **Green dot** = Connection is enabled
- **Gray dot** = Connection is disabled

Toggle connections on/off using the Enable/Disable button.

## Browsing & Connecting Tools

### Browse Available Tools

1. Go to **Settings** → **MCP** tab
2. Click **"Browse 250+ Tools"** button
3. A modal opens showing all available tools
4. Use the search bar to find specific tools
5. Filter by category using the chips

### Connect a Tool

1. Find the tool you want (e.g., GitHub, Slack, Gmail)
2. Click **"+ Connect"** button
3. A new window opens for OAuth authorization
4. Authorize the tool in your browser
5. The tool shows **"● On"** with a green pulse when connected

### Manage Connected Tools

Once tools are connected, they appear as chips under your connection:

- **Toggle On/Off**: Enable or disable without disconnecting
- **Remove**: Click **×** to completely remove the connection
- **Add More**: Click **"+ Add More"** to browse more tools

### Connected Tools Status

| Indicator | Meaning |
|-----------|---------|
| 🟢 Pulse | Tool is enabled and active |
| ⚪ Gray dot | Tool is disabled |
| 🔄 Spinner | OAuth connection in progress |

## MCP Access

Composio tools are available via the MCP server at:

```
http://127.0.0.1:3001/mcp
```

### Tool Naming

Tools are named: `composio_{toolkit}_{action}`

Examples:
- `composio_github_issues_create`
- `composio_slack_messages_send`
- `composio_gmail_send_email`

### Using with OpenClaw

Configure OpenClaw to connect to Claws MCP server:

```json
{
  "mcpServers": {
    "claws-desktop": {
      "url": "http://127.0.0.1:3001/mcp"
    }
  }
}
```

## Testing

Run the test script:

```bash
cd claws-desktop
./scripts/test-composio.sh
```

## Architecture

```
+---------------------+
|   Claws Desktop     |
|  +---------------+  |
|  |  MCP Server   |  |  <- port 3001
|  |  (built-in +  |  |
|  |   Composio)   |  |
|  +-------+-------+  |
|          |          |
|  +-------v-------+  |
|  |  Composio     |  |
|  |  Service      |  |
|  +-------+-------+  |
+----------|----------+
           |
    +------v------+
    |  Composio   |
    |  Cloud API  |
    +------+------+
           |
    +------v------+
    |  External   |
    |  Services   |
    |  (GitHub,   |
    |   Slack...) |
    +-------------+
```

## Troubleshooting

### "No Composio tools configured"

You need to:
1. Add your API key in Settings -> MCP
2. Ensure the connection is **Enabled** (green dot)

### "API key invalid"

- Check your key at [app.composio.dev](https://app.composio.dev)
- Make sure it's copied correctly (no extra spaces)

### "MCP server not responding"

- Make sure Claws Desktop is running
- Check if port 3001 is available
- Look for errors in the developer console (View -> Toggle Developer Tools)

### "Tools not showing up"

1. Restart the app after adding a connection
2. Run `./scripts/test-composio.sh` to diagnose
3. Check the MCP tab shows the connection as enabled

## Security Notes

- API keys are stored locally in SQLite
- Keys are NOT encrypted (planned for future update)
- Never share your API key
- Rotate keys periodically in Composio dashboard

## Related Docs

- [MCP Setup Guide](./MCP-SETUP.md)
- [Features Roadmap](../../docs/plans/providers/FEATURES-ROADMAP.md)
