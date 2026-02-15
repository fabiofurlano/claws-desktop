# Claws Desktop - Features Roadmap

**Last Updated:** 2026-02-15 21:55

---

## Core Vision

A self-improving AI assistant desktop app that can:
- Run locally on user's machine
- Connect to OpenClaw (remote co-pilot)
- Execute via Claude Code (local builder)
- Improve itself over time

---

## Phase 1: Foundation ✅ (DONE)

- [x] Electron + React + TypeScript setup
- [x] SQLite database with IPC bridge
- [x] AI providers (OpenAI, Anthropic, OpenRouter, Z.AI)
- [x] Chat Mode / Agent Mode switching
- [x] Settings page with provider management
- [x] Onboarding wizard (basic)
- [x] Skills system UI

---

## Phase 2: MCP Bridge ✅ (DONE)

### 2.1 MCP Server
- [x] Install `@modelcontextprotocol/sdk`
- [x] Create `electron/mcp-server.ts` (HTTP transport, port 3001)
- [x] Expose tools:
  - `read_git_log` - recent commits
  - `read_file` - read project files
  - `get_memory_stats` - SQLite stats
  - `run_claude_code` - execute Claude Code with prompt (stub)

### 2.2 OpenClaw Connection
- [x] Document MCP endpoint URL (`docs/MCP-SETUP.md`)
- [x] Automated test script (`scripts/test-mcp.sh`)
- [ ] User adds to OpenClaw config (manual step)

---

## Phase 3: Self-Improvement Loop

### 3.1 Claude Code Integration
- [ ] Create `electron/claude-code-runner.ts`
- [ ] Spawn Claude Code process from Electron
- [ ] Capture output and errors
- [ ] Store results in SQLite

### 3.2 Feature Proposal System
- [ ] Add `proposed_features` table to SQLite
- [ ] Create `ProposedFeatures.tsx` component
- [ ] UI in Agent Mode sidebar
- [ ] Approve/Dismiss buttons
- [ ] On approve → run Claude Code to implement

### 3.3 Scheduled Analysis
- [ ] Run self-analysis every 6 hours
- [ ] Check git diff
- [ ] Send to Claude Code with "suggest improvements"
- [ ] Store proposals in database
- [ ] Notify user

---

## Phase 4: Onboarding Features

### 4.1 Deep Onboarding (OPTIONAL)
- [ ] Import prompts from OpenClaw After-Setup Pack
- [ ] Let user choose: Quick Start vs Deep Onboarding
- [ ] If Deep:
  - [ ] Interview user (questions one at a time)
  - [ ] Save to USER.md
  - [ ] Suggest 10 things to help with

### 4.2 Skill Generator
- [ ] UI to create new skills
- [ ] Template: description, when to use, steps
- [ ] Save to `skills/` folder
- [ ] Best practices from prompt pack

### 4.3 Agent Generator
- [ ] UI to create sub-agents
- [ ] Choose: personality, skills, tools
- [ ] Generate agent config
- [ ] Use Claude Code to scaffold

---

## Phase 5: OpenClaw Integration

### 5.1 Bidirectional Communication
- [ ] I (OpenClaw) can call MCP tools
- [ ] Desktop app can send messages to me
- [ ] Shared context sync

### 5.2 Use Cases
- [ ] I review code changes
- [ ] I suggest features
- [ ] I guide Claude Code execution
- [ ] I track progress over time

---

## Future Ideas

- [ ] Gemini CLI integration (alternative to Claude Code)
- [ ] Happy wrapper integration (remote access)
- [ ] Plugin system for custom tools
- [ ] Multi-project support
- [ ] Team collaboration features
- [ ] Cloud sync (optional)

---

## Architecture

```
User (ideas)
    ↓
OpenClaw (strategy, co-pilot)
    ↓
Claws Desktop (MCP server)
    ↓
Claude Code (execution)
    ↓
Self-improving app
```

---

## Key Files

| File | Purpose |
|------|---------|
| `electron/mcp-server.ts` | MCP HTTP server |
| `electron/claude-code-runner.ts` | Spawn Claude Code |
| `electron/database.ts` | SQLite + proposed_features |
| `src/components/ProposedFeatures.tsx` | Feature approval UI |
| `docs/MCP-INTEGRATION-PLAN.md` | Technical details |

---

## Notes

- Deep onboarding is OPTIONAL - some users prefer manual setup
- MCP uses HTTP transport (port 3001) for remote access
- Self-analysis runs every 6 hours
- All proposals stored in SQLite for tracking

---

*This file tracks all features. Update as we build.*
