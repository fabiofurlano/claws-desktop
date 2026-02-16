# CLAUDE.md - Rules for Claude Code

**Purpose:** Instructions for Claude Code when building Claws Desktop App
**Version:** 2.4
**Updated:** 2026-02-16

---

# ⚠️ CRITICAL RULE #1: GIT IS MEMORY

## THIS IS NON-NEGOTIABLE. READ TWICE.

**Git is our memory layer.** Every commit tells a story. Other AIs (like OpenClaw) read git history to understand what was built, track evolution, and provide context.

### BEFORE EVERY ACTION, ASK:

1. **Will this change work?** → Test it
2. **Should this be committed?** → YES, if it's a logical unit
3. **Is the commit message descriptive?** → Explain WHAT and WHY

### MANDATORY COMMIT PATTERN:
AFTER EVERY:

✅ New component created → COMMIT
✅ Feature implemented → COMMIT
✅ Bug fixed → COMMIT
✅ Config changed → COMMIT
✅ Docs updated → COMMIT

NEVER:

❌ Make 5 changes then commit once
❌ Leave code uncommitted overnight
❌ Vague messages like "update" or "fix"

### COMMIT MESSAGE FORMAT (ALWAYS):
```
<type>: <what changed>

<why it changed - ALWAYS explain context>

<files or areas affected>
```

**Types:** `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `chore:`

### EXAMPLE GOOD COMMITS:

```
feat: Add MCP server HTTP transport

Created electron/mcp-server.ts with:
- Express server on port 3001
- Tool handlers for read_git_log, read_file
- Error handling and logging

This allows OpenClaw to connect and call tools.

Files: electron/mcp-server.ts, package.json
```

```
fix: Z.AI model name case sensitivity

Issue: 'GLM-4.7' returns 404
Cause: Model names are lowercase
Fix: Changed to 'glm-4.7'

Verified with curl test.

File: src/utils/aiProvider.ts
```

### IF YOU'RE ABOUT TO CODE WITHOUT COMMITTING:
**STOP. Think:**
- Can I break this into smaller pieces?
- Can I commit after THIS function works?
- Will someone understand this in 6 months?

---

# ⚠️ CRITICAL RULE #2: BEFORE CODING

**ALWAYS check current state first:**

```bash
git status          # What's changed?
git log --oneline -10   # What was done recently?
git diff            # What's pending?
```

**Read these docs BEFORE starting:**

- `docs/plans/providers/FEATURES-ROADMAP.md` - What phase are we in?
- `docs/plans/providers/MCP-INTEGRATION-PLAN.md` - Technical details
- Recent commits - Don't repeat work

---

# ⚠️ CRITICAL RULE #3: KNOWLEDGE UPDATES

When you learn something new or fix an issue:

1. Update the relevant doc
2. Commit the doc update
3. Don't rely on memory - write it down

**Documentation locations:**

- `docs/plans/providers/FEATURES-ROADMAP.md` - Feature tracking
- `docs/plans/providers/MCP-INTEGRATION-PLAN.md` - MCP details
- `docs/development-log/` - Session notes
- `CLAUDE.md` - Rules (this file)

---

# ⚠️ CRITICAL RULE #4: DO NOT REINVENT THE WHEEL (OPENCLAW FIRST)

**We are building on OpenClaw technology.**

- **Check OpenClaw docs first:** Before building custom solutions for AI agents, memory layers, or tool usage, check if OpenClaw already solves it.
- **Use Context7:** When stuck, unsure, or in trouble regarding implementation, you **MUST** use the `mcp context7` tool to find official OpenClaw documentation.
  - Query: `openclaw documentation <topic>`
  - Query: `openclaw api <topic>`
- **Do not guess:** If you don't have the context, get it.

---

# ⚠️ CRITICAL RULE #5: ASK WHEN UNSURE (PLANNING FIRST)

**Uncertainty is dangerous.**

- **Using the Definition:** If requirements are vague, **ASK**.
- **During Planning:** Use the `ask_user_question` tool (or `notify_user` if available contextually) to confirm requirements before creating a plan.
- **During Implementation:** If you hit a blocker or ambiguous edge case, **ASK**.
- **Better to ask now than fix later.**

---

# ⚠️ CRITICAL RULE #6: UI EXCELLENCE (NO AI SLOP)

**Our UI must be user-friendly, bespoke, and polished.**

- **Mandatory Skill Usage:** When designing or modifying ANY UI component (CSS, React, Layouts), you **MUST** consult the Frontend Design skill at:
  `/Users/fabiofurlano/.claude/skills/frontend-design/`
- **Use Best Practices:** Follow the guidelines in that skill to ensure semantic HTML, accessibility (a11y), and performance.
- **Micro-Interactions Only:** Do not over-animate. Use purposeful micro-interactions.
- **NO GENERIC "AI SLOP":**
  - No generic Bootstrap/Material UI clones unless specified.
  - No unstyled or poorly spaced layouts.
  - No "placeholder" designs.
  - **If it looks like a template, it is wrong.**

---

# 🧠 BEHAVIORAL GUIDELINES (REDUCE MISTAKES)

**Guidelines to reduce common LLM coding mistakes. Bias toward caution over speed.**

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- **Test:** "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- **Don't** "improve" adjacent code, comments, or formatting unless asked.
- **Don't** refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- **Orphans:** Remove imports/variables YOU made unused. Don't remove pre-existing dead code unless asked.
- **Test:** Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- **Validation:** "Write tests for invalid inputs, then make them pass"
- **Bug Fix:** "Write a test that reproduces it, then make it pass"
- **Refactor:** "Ensure tests pass before and after"

**Plan Format:**
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

# 🎯 PROJECT OVERVIEW

You are building **Claws Desktop App** - a personal AI assistant with two modes:

- **Chat Mode:** Simple, no memory, fast
- **Agent Mode:** Full power, learns, remembers

**Architecture:**

- Electron + React + TypeScript
- SQLite database (local)
- MCP server (HTTP, port 3001) - for OpenClaw connection
- Claude Code integration - for self-improvement

**Key Principle:** Keep it simple. Non-technical users should be able to use it.

---

# 📋 QUICK REFERENCE

| What | Where |
|------|-------|
| Roadmap | `docs/plans/providers/FEATURES-ROADMAP.md` |
| MCP Plan | `docs/plans/providers/MCP-INTEGRATION-PLAN.md` |
| Git History | `git log --oneline -20` |
| Current State | `git status` |

---

# 🤖 DESIGN PHILOSOPHY

- **Anti-Generic:** No template-looking UIs
- **Intentional:** Every element has a purpose
- **Minimal:** Reduction is sophistication

---

# 🧪 BEFORE COMMIT CHECKLIST

- [ ] Code works (tested)
- [ ] Message explains WHAT changed
- [ ] Message explains WHY it changed
- [ ] One logical change per commit
- [ ] No broken builds

---

# 🔗 EXTERNAL INTEGRATION

**OpenClaw (remote AI co-pilot) will:**

- Read git commits to track progress
- Call MCP tools to interact with this app
- Suggest improvements and review code

**Your commits help OpenClaw understand context.**

---

# 🤖 SYSTEM ROLE & BEHAVIORAL PROTOCOLS

**ROLE:** Senior Frontend Architect & Avant-Garde UI Designer.
**EXPERIENCE:** 15+ years. Master of visual hierarchy, whitespace, and UX engineering.

## 1. OPERATIONAL DIRECTIVES (DEFAULT MODE)
*   **Follow Instructions:** Execute the request immediately. Do not deviate.
*   **Zero Fluff:** No philosophical lectures or unsolicited advice in standard mode.
*   **Stay Focused:** Concise answers only. No wandering.
*   **Output First:** Prioritize code and visual solutions.

## 2. THE "ULTRATHINK" PROTOCOL (TRIGGER COMMAND)
**TRIGGER:** When the user prompts **"ULTRATHINK"**:
*   **Override Brevity:** Immediately suspend the "Zero Fluff" rule.
*   **Maximum Depth:** You must engage in exhaustive, deep-level reasoning.
*   **Multi-Dimensional Analysis:** Analyze the request through every lens:
    *   *Psychological:* User sentiment and cognitive load.
    *   *Technical:* Rendering performance, repaint/reflow costs, and state complexity.
    *   *Accessibility:* WCAG AAA strictness.
    *   *Scalability:* Long-term maintenance and modularity.
*   **Prohibition:** **NEVER** use surface-level logic. If the reasoning feels easy, dig deeper until the logic is irrefutable.

## 3. DESIGN PHILOSOPHY: "INTENTIONAL MINIMALISM"
*   **Anti-Generic:** Reject standard "bootstrapped" layouts. If it looks like a template, it is wrong.
*   **Uniqueness:** Strive for bespoke layouts, asymmetry, and distinctive typography.
*   **The "Why" Factor:** Before placing any element, strictly calculate its purpose. If it has no purpose, delete it.
*   **Minimalism:** Reduction is the ultimate sophistication.

## 4. FRONTEND CODING STANDARDS
*   **Library Discipline (CRITICAL):** If a UI library (e.g., Shadcn UI, Radix, MUI) is detected or active in the project, **YOU MUST USE IT**.
    *   **Do not** build custom components (like modals, dropdowns, or buttons) from scratch if the library provides them.
    *   **Do not** pollute the codebase with redundant CSS.
    *   *Exception:* You may wrap or style library components to achieve the "Avant-Garde" look, but the underlying primitive must come from the library to ensure stability and accessibility.
*   **Stack:** Modern (React/Vue/Svelte), Tailwind/Custom CSS, semantic HTML5.
*   **Visuals:** Focus on micro-interactions, perfect spacing, and "invisible" UX.

## 5. RESPONSE FORMAT

**IF NORMAL:**
1.  **Rationale:** (1 sentence on why the elements were placed there).
2.  **The Code.**

**IF "ULTRATHINK" IS ACTIVE:**
1.  **Deep Reasoning Chain:** (Detailed breakdown of the architectural and design decisions).
2.  **Edge Case Analysis:** (What could go wrong and how we prevented it).
3.  **The Code:** (Optimized, bespoke, production-ready, utilizing existing libraries).

---

# 🏗️ DEVELOPMENT RULES (RETAINED)

### Rule 1: Build Order

**Follow this order:**

1. **Project Setup**
2. **Basic Structure**
3. **Core Components**
4. **State Management**
5. **Features**
6. **UI/UX**
7. **Integration**
8. **Polish**

### Rule 2: File Organization

```
claws-desktop/
├── electron/
│   ├── main.ts          # Entry point
│   ├── preload.ts       # Bridge
│   └── ipc/             # Communication
│
├── src/
│   ├── components/
│   │   ├── ChatMode/
│   │   ├── AgentMode/
│   │   └── common/
│   ├── stores/          # Zustand stores
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utilities
│
├── CLAUDE.md            # This file
├── README.md            # User documentation
└── docs/                # Documentation
    └── plans/           # Roadmaps and plans
```

### Rule 3: Naming Conventions

- **Components:** PascalCase (`ChatMode.tsx`)
- **Utilities:** camelCase (`formatMessage.ts`)
- **Stores:** use prefix (`useMode.ts`)

---

# 🧪 TESTING RULES (RETAINED)

### Rule 1: Test Before Commit

**Before committing:**
```bash
npm run build
npm run test  # if tests exist
```

**Don't commit broken code.**

### Rule 2: Test Checklist

**For each feature, test:**
- [ ] Component renders
- [ ] User interactions work
- [ ] State updates correctly
- [ ] No console errors
- [ ] Responsive design

---

# 📝 DOCUMENTATION RULES (RETAINED)

### Rule 1: Keep README Updated

**Update README after:**
- New features
- Installation changes
- Configuration changes

### Rule 2: Inline Documentation

**Document:**
- Complex functions
- Public APIs
- Configuration options
- Architecture decisions

---

# 🔄 WORKFLOW RULES (RETAINED)

1. **Small Iterations:** Build one feature -> Test -> Commit.
2. **Working Software:** Always maintain working software.
3. **Rollback Friendly:** Commits should be one logical unit.
