# CLAUDE.md - Rules for Claude Code

**Purpose:** Instructions for Claude Code when building Claws Desktop App
**Version:** 1.0
**Created:** 2026-02-14

---

## 🎯 PROJECT OVERVIEW

You are building **Claws Desktop App** - a personal AI assistant with two modes:

- **Chat Mode:** Simple, no memory, fast
- **Agent Mode:** Full power, learns, remembers

**Architecture:**
- Electron + React + TypeScript
- Local-only (runs on user's machine)
- Open source (MIT license)

**Key Principle:** Keep it simple. Non-technical users should be able to use it.

---

## 📋 GIT RULES (CRITICAL)

### Rule 1: Commit After Every Important Change

**When to commit:**
- ✅ After creating a new component
- ✅ After implementing a feature
- ✅ After fixing a bug
- ✅ After refactoring code
- ✅ After updating configuration
- ✅ After adding documentation

**When NOT to commit:**
- ❌ Half-finished changes
- ❌ Broken code
- ❌ Temporary experiments

---

### Rule 2: Use Descriptive Commit Messages

**Format:**
```
<type>: <short description>

<detailed explanation if needed>

<what changed>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code improvement
- `docs:` - Documentation
- `style:` - Formatting
- `test:` - Testing
- `chore:` - Maintenance

---

### Rule 3: Commit Message Examples

**Good commits:**
```bash
feat: Add Chat Mode component

Created ChatMode.tsx with:
- Message display
- Input handling
- Basic styling

This is the lightweight chat interface that
doesn't store memory or use tools.
```

```bash
feat: Add Agent Mode component

Created AgentMode.tsx with:
- Full memory integration
- Tool access
- Learning system active
- Sidebar with memory viewer

This is the full-power mode that learns from user.
```

```bash
feat: Implement mode switching

Added ModeSwitcher component and useMode store.
- Zustand for state management
- Persisted to localStorage
- Instant switching between modes
```

```bash
fix: Memory not persisting in Agent mode

Issue: Memory was reset on app restart
Cause: Zustand persist not configured
Fix: Added persist middleware with correct config

Files changed:
- src/stores/useAgent.ts
```

```bash
refactor: Simplify message handling

Extracted common message logic into
useMessageHandler hook. Both ChatMode and
AgentMode now use shared logic.
```

**Bad commits:**
```bash
# ❌ Too vague
update

# ❌ No context
fixed bug

# ❌ Multiple unrelated changes
added features and fixed bugs and updated styles
```

---

### Rule 4: Commit Frequency

**Aim for:** 5-15 commits per day of work

**Too few (< 5):** Changes are too big, hard to track
**Too many (> 30):** Too granular, noise in history

**Sweet spot:** One logical change = one commit

---

### Rule 5: Atomic Commits

**Each commit should:**
- ✅ Represent ONE logical change
- ✅ Be reversible without breaking things
- ✅ Make sense on its own
- ✅ Pass tests (if tests exist)

**Example:**
```
✅ Good: "feat: Add settings page"
   Then: "feat: Add provider configuration"
   Then: "feat: Add API key input"

❌ Bad: "feat: Add settings, providers, API keys, and themes"
```

---

## 🏗️ DEVELOPMENT RULES

### Rule 1: Build Order

**Follow this order:**

1. **Project Setup**
   ```bash
   git commit -m "chore: Initialize Electron project"
   ```

2. **Basic Structure**
   ```bash
   git commit -m "chore: Set up project structure"
   ```

3. **Core Components**
   ```bash
   git commit -m "feat: Add App component"
   git commit -m "feat: Add ChatMode component"
   git commit -m "feat: Add AgentMode component"
   ```

4. **State Management**
   ```bash
   git commit -m "feat: Add useMode store"
   git commit -m "feat: Add useChat store"
   git commit -m "feat: Add useAgent store"
   ```

5. **Features**
   ```bash
   git commit -m "feat: Implement mode switching"
   git commit -m "feat: Add message handling"
   git commit -m "feat: Add memory persistence"
   ```

6. **UI/UX**
   ```bash
   git commit -m "style: Add Chat Mode styling"
   git commit -m "style: Add Agent Mode styling"
   ```

7. **Integration**
   ```bash
   git commit -m "feat: Integrate OpenClaw core"
   git commit -m "feat: Add self-learning layer"
   ```

8. **Polish**
   ```bash
   git commit -m "refactor: Improve performance"
   git commit -m "docs: Add user documentation"
   ```

---

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
└── SPECS-DESKTOP-APP.md # Full specs
```

---

### Rule 3: Naming Conventions

**Components:** PascalCase
```typescript
ChatMode.tsx
AgentMode.tsx
ModeSwitcher.tsx
```

**Utilities:** camelCase
```typescript
formatMessage.ts
handleApiError.ts
storageHelper.ts
```

**Stores:** use prefix
```typescript
useMode.ts
useChat.ts
useAgent.ts
```

---

### Rule 4: Comments in Code

**Add comments for:**
- Complex logic
- Non-obvious decisions
- Workarounds
- TODOs
- Important patterns

**Example:**
```typescript
// Store only last 10 messages in chat mode
// to keep context window small and responses fast
const messages = [...state.messages, newMessage].slice(-10);
```

```typescript
// TODO: Add encryption for API keys before storing
// Currently stored in plain text (security issue)
await storage.set('api_key', key);
```

---

## 🧪 TESTING RULES

### Rule 1: Test Before Commit

**Before committing:**
```bash
npm run build
npm run test  # if tests exist
```

**Don't commit broken code.**

---

### Rule 2: Test Checklist

**For each feature, test:**
- [ ] Component renders
- [ ] User interactions work
- [ ] State updates correctly
- [ ] No console errors
- [ ] Responsive design

---

## 📝 DOCUMENTATION RULES

### Rule 1: Keep README Updated

**README should explain:**
- What the app does
- How to install
- How to use
- How to contribute

**Update README after:**
- New features
- Installation changes
- Configuration changes

```bash
git commit -m "docs: Update README with new feature"
```

---

### Rule 2: Inline Documentation

**Document:**
- Complex functions
- Public APIs
- Configuration options
- Architecture decisions

---

## 🔄 WORKFLOW RULES

### Rule 1: Small Iterations

**Don't try to build everything at once.**

**Instead:**
1. Build one feature
2. Test it
3. Commit it
4. Move to next

---

### Rule 2: Working Software

**Always maintain working software.**

**After each commit:**
- App should run
- No breaking changes
- User can test

---

### Rule 3: Rollback Friendly

**Commits should be easy to roll back.**

**If a commit causes issues:**
```bash
git revert HEAD
```

**Should restore working state.**

---

## 🚨 IMPORTANT REMINDERS

### Reminder 1: Git is Memory

**Git history tells a story:**
- What was built
- When it was built
- Why it was built
- How it evolved

**Future developers (or AI) will read this.**

**Write commits that tell the story clearly.**

---

### Reminder 2: I Can Query Git

**The other AI (Claws) can read git history to:**
- Understand what was built
- Learn from decisions
- Track evolution
- Provide context

**Good commits = better context for AI.**

---

### Reminder 3: Open Source

**This will be public on GitHub.**

**Commits should:**
- Be professional
- Be clear
- Help contributors
- Document decisions

---

## ✅ COMMIT CHECKLIST

**Before every commit, ask:**

- [ ] Does this represent ONE logical change?
- [ ] Is the commit message descriptive?
- [ ] Is the code working?
- [ ] Would this make sense to someone else?
- [ ] Can this be easily rolled back?
- [ ] Does the message explain WHY?

---

## 🎯 SUMMARY

**Key rules:**

1. ✅ Commit often (after each feature)
2. ✅ Write descriptive messages
3. ✅ One change per commit
4. ✅ Keep code working
5. ✅ Document in commits
6. ✅ Think of git as memory

**Goal:** Create a clear, useful git history that tells the story of how this app was built.

---

*These rules are critical*
*Follow them strictly*
*Git is our memory layer*
```markdown
---

## 🔍 KNOWLEDGE & RESEARCH RULES

### Rule 1: Latest Documentation
**Always ensure you have the latest API and OpenClaw documentation.**
- Use the `context7` plugin to retrieve up-to-date context.
- If a solution is not found in local context, **search the web** immediately.
- Do not guess API signatures or internal OpenClaw logic.

### Rule 2: Memory Updates
**Keep the development log updated.**
- After significant changes or research findings, update the log at:
  `/Users/fabiofurlano/Documents/whop/docs/development-log`
```
