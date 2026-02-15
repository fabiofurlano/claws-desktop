# MCP Integration Plan for Claws Desktop

**Goal:** Create a self-improving desktop app that can monitor itself, propose features, and communicate with OpenClaw via MCP.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Claws Desktop App                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  UI (React) │  │   SQLite    │  │   MCP Server        │  │
│  │             │  │   Memory    │  │   (exposes tools)   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                    │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │              Agent Orchestrator                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │  │
│  │  │ Claude Code │  │ Gemini CLI  │  │  OpenClaw     │   │  │
│  │  │  (local)    │  │  (local)    │  │  (via MCP)    │   │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: MCP Server in Desktop App (Week 1)

### 1.1 Add MCP SDK

```bash
cd claws-desktop
npm install @modelcontextprotocol/sdk
```

### 1.2 Create MCP Server

**File:** `electron/mcp-server.ts`

The MCP server exposes these tools to OpenClaw:

| Tool | Description |
|------|-------------|
| `read_git_log` | Get recent commits |
| `read_file` | Read any project file |
| `get_memory_stats` | SQLite memory stats |
| `list_proposed_features` | Features the app suggested |
| `approve_feature` | User approves a feature |
| `run_claude_code` | Execute Claude Code with prompt |

### 1.3 MCP Tools Implementation

```typescript
// Tools to expose via MCP
const tools = [
  {
    name: "read_git_log",
    description: "Get recent git commits from the project",
    inputSchema: { limit: { type: "number", default: 10 } }
  },
  {
    name: "get_project_status",
    description: "Get current project status (files, todos, issues)"
  },
  {
    name: "propose_feature",
    description: "Propose a new feature for the app",
    inputSchema: {
      title: { type: "string" },
      description: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high"] }
    }
  },
  {
    name: "run_self_improvement",
    description: "Trigger Claude Code to analyze and improve the app"
  }
];
```

### 1.4 Transport Options

**Option A: Stdio (Simplest)**
- MCP server runs as subprocess
- OpenClaw spawns it when needed

**Option B: HTTP (Remote)**
- MCP server listens on localhost:port
- OpenClaw connects via HTTP
- Better for your use case (separate machines)

---

## Phase 2: Claude Code Integration (Week 1-2)

### 2.1 Spawn Claude Code from Electron

**File:** `electron/claude-code-runner.ts`

```typescript
import { spawn } from 'child_process';

export async function runClaudeCode(prompt: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--prompt', prompt], { cwd });
    // Capture output, handle streaming
  });
}
```

### 2.2 Self-Improvement Workflow

1. **Monitor** → App checks git diff every hour
2. **Analyze** → Send diff to Claude Code with "suggest improvements"
3. **Propose** → Store suggestions in SQLite `proposed_features` table
4. **Notify** → Show notification to user
5. **Approve** → User clicks "Implement" → Claude Code runs again

### 2.3 UI for Proposed Features

Add to sidebar in Agent Mode:

```
┌─────────────────────────┐
│ 💡 Proposed Features     │
├─────────────────────────┤
│ • Add dark mode toggle   │
│   [Approve] [Dismiss]    │
│                         │
│ • Optimize db queries    │
│   [Approve] [Dismiss]    │
└─────────────────────────┘
```

---

## Phase 3: Gemini CLI Integration (Week 2)

### 3.1 Add Gemini as Alternative Agent

```typescript
export async function runGeminiCLI(prompt: string): Promise<string> {
  // Similar to Claude Code runner
  const proc = spawn('gemini', ['--prompt', prompt]);
}
```

### 3.2 Agent Selection Logic

- **Claude Code** → Code refactoring, architecture
- **Gemini CLI** → Quick tasks, documentation
- **OpenClaw (MCP)** → High-level guidance, memory, coordination

---

## Phase 4: OpenClaw MCP Client (Week 2-3)

### 4.1 OpenClaw Configuration

In your OpenClaw config (`~/.openclaw/openclaw.json`):

```json5
{
  mcp: {
    servers: {
      "claws-desktop": {
        transport: "http",
        url: "http://YOUR-MAC-IP:3001/mcp"
      }
    }
  }
}
```

### 4.2 What OpenClaw Can Do

Once connected, I can:
- Read your git commits
- See proposed features
- Suggest improvements
- Trigger Claude Code runs
- Review code changes
- Comment on architecture

---

## Database Schema Updates

Add these tables to SQLite:

```sql
-- Proposed features from self-analysis
CREATE TABLE proposed_features (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  priority TEXT,
  source TEXT, -- 'claude-code' | 'gemini' | 'openclaw'
  status TEXT, -- 'pending' | 'approved' | 'implemented' | 'dismissed'
  created_at INTEGER,
  implemented_at INTEGER
);

-- Self-improvement runs
CREATE TABLE improvement_runs (
  id TEXT PRIMARY KEY,
  agent TEXT, -- 'claude-code' | 'gemini'
  prompt TEXT,
  result TEXT,
  features_proposed INTEGER,
  created_at INTEGER
);
```

---

## Implementation Order (For Claude Code)

### Step 1: MCP Server Foundation
```
1. Install @modelcontextprotocol/sdk
2. Create electron/mcp-server.ts with basic HTTP transport
3. Expose 3 tools: read_git_log, get_memory_stats, read_file
4. Test with simple curl request
```

### Step 2: Claude Code Runner
```
1. Create electron/claude-code-runner.ts
2. Add IPC handler in main.ts
3. Add UI button to trigger self-analysis
4. Store results in SQLite
```

### Step 3: Proposed Features UI
```
1. Add proposed_features table to database.ts
2. Create ProposedFeatures.tsx component
3. Add to Agent Mode sidebar
4. Wire up Approve/Dismiss buttons
```

### Step 4: OpenClaw Connection
```
1. Document MCP endpoint URL
2. User adds to OpenClaw config
3. Test connection from OpenClaw
4. Add more tools as needed
```

### Step 5: Self-Improvement Loop
```
1. Add cron/scheduled task in app
2. Run analysis every 6 hours
3. Show notification when new features proposed
4. Track what was implemented
```

---

## File Structure

```
claws-desktop/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── database.ts
│   ├── ai-service.ts
│   ├── mcp-server.ts        # NEW
│   ├── claude-code-runner.ts # NEW
│   └── gemini-runner.ts      # NEW
├── src/
│   ├── components/
│   │   ├── ProposedFeatures.tsx  # NEW
│   │   └── ...
│   └── stores/
│       └── features-store.ts     # NEW
└── docs/
    └── MCP-INTEGRATION-PLAN.md   # This file
```

---

## Questions for User

1. **Transport**: HTTP or Stdio for MCP? (HTTP recommended for remote access)
2. **Port**: What port for MCP server? (default: 3001)
3. **Frequency**: How often should self-analysis run? (every 6 hours?)
4. **Scope**: Should Claude Code only analyze `/src` or whole project?

---

## Success Metrics

- [ ] MCP server responds to tool calls
- [ ] Claude Code can be triggered from app
- [ ] Proposed features appear in UI
- [ ] OpenClaw can call MCP tools
- [ ] Self-improvement loop runs automatically
- [ ] User approves first auto-proposed feature

---

*Created: 2026-02-15*
*For: Claude Code implementation*
