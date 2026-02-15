# Claws Desktop App — Master Implementation Plan

> **Date:** 2026-02-15
> **Source Docs:** [SPECS-DESKTOP-APP.md](file:///Users/fabiofurlano/Downloads/AI-personal/docs/SPECS-DESKTOP-APP.md) · [IMPLEMENTATION-GUIDE.md](file:///Users/fabiofurlano/Downloads/AI-personal/docs/IMPLEMENTATION-GUIDE.md)
>
> **Project Location:** `/Users/fabiofurlano/Downloads/AI-personal/claws-desktop/`
> **Tech Stack:** Electron 28 · React 18 · TypeScript 5 · Zustand 4 · TailwindCSS 3 · Vite 5 · SQLite (Phase 2)

---

## Design Philosophy

> [!IMPORTANT]
> This is a **dual-personality app** — the mode switch isn't just a color change, it's a complete atmosphere transformation.

| Aspect | Chat Mode | Agent Mode |
|--------|-----------|------------|
| **Feel** | Warm, inviting, soft gradients | Technical, deep, focused |
| **Theme** | Light with glassmorphism | Near-black with depth panels |
| **Typography** | Plus Jakarta Sans | JetBrains Mono accents |
| **Accent** | Blue `#3B82F6` / Amber `#F59E0B` | Emerald `#10B981` / Cyan `#06B6D4` |
| **Memory** | None — last 10 messages only | Full persistent memory |
| **Temperature** | 0.7 (creative) | 0.3 (focused) |

---

## Phase 1 — MVP Foundation (Priority: Get It Running)

> **Goal:** A running Electron app with two visually distinct switchable modes, simulated AI responses, and a premium feel.

---

### Task 1.1 · Initialize Project

| | |
|---|---|
| **What** | Create `claws-desktop/` directory, initialize project, install all core dependencies |
| **Files** | `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore` |
| **Dependencies** | `react`, `react-dom`, `zustand` (runtime) · `electron`, `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `concurrently`, `wait-on`, `electron-builder` (dev) |
| **Key Details** | Tailwind configured with custom dual-palette (chat/agent colors). Google Fonts linked for Plus Jakarta Sans + JetBrains Mono. Path aliases `@/*` → `./src/*`. CSP header in `index.html`. |
| **Commit** | `chore: initialize Electron + React + TypeScript + Tailwind project` |
| **Time** | ~20 min |

<details>
<summary>📋 Config: tailwind.config.js</summary>

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chat: {
          primary: '#3B82F6', secondary: '#8B5CF6', accent: '#F59E0B',
          bg: '#FAFBFC', surface: '#FFFFFF', text: '#1F2937',
          muted: '#6B7280', border: '#E5E7EB',
        },
        agent: {
          primary: '#10B981', secondary: '#059669', accent: '#06B6D4',
          bg: '#0C0C0C', surface: '#161616', surfaceAlt: '#1F1F1F',
          text: '#F3F4F6', muted: '#9CA3AF', border: '#262626',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'glow-chat': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-agent': '0 0 20px rgba(16, 185, 129, 0.15)',
      },
    },
  },
  plugins: [],
}
```
</details>

---

### Task 1.2 · Electron Main Process + Preload

| | |
|---|---|
| **What** | Create `electron/main.ts` — BrowserWindow (1200×800, min 800×600), hidden title bar, secure webPreferences, dev/prod URL loading. Create `electron/preload.ts` — expose safe API via `contextBridge`. Create `src/types/electron.d.ts` for type safety. |
| **Key Details** | `titleBarStyle: 'hiddenInset'`, `trafficLightPosition: { x: 16, y: 16 }`, `contextIsolation: true`, `nodeIntegration: false`. IPC handlers: `get-app-version`, `get-platform`, `get-theme`. Theme change listener forwarded to renderer. |
| **Commit** | `feat: add Electron main process with IPC bridge` |
| **Time** | ~20 min |

---

### Task 1.3 · Base Styles (CSS Foundation)

| | |
|---|---|
| **What** | Create `src/index.css` with Tailwind directives + custom component classes |
| **Key Details** | CSS variables for gradients (`--gradient-chat`, `--gradient-agent`, `--gradient-agent-glow`). Reusable classes: `.glass-panel` (glassmorphism for chat), `.depth-panel` (elevated dark surface for agent), `.btn`, `.input-chat`, `.input-agent`, `.drag-region`, `.no-drag`, `.mode-transition`. Custom scrollbar styling for light/dark. |
| **Commit** | `style: add base Tailwind styles with dual-mode components` |
| **Time** | ~15 min |

---

### Task 1.4 · Zustand Stores (Mode + Chat + Agent)

| | |
|---|---|
| **What** | Create three stores with selector hooks for optimized re-renders |
| **Files** | `src/stores/mode-store.ts`, `src/stores/chat-store.ts`, `src/stores/agent-store.ts`, `src/types/message.ts` |

**Mode Store (`mode-store.ts`):**
- State: `mode` (`'chat'` | `'agent'`), `setMode()`, `toggleMode()`
- Persisted to localStorage (`claws-mode`)
- Default: `chat`

**Chat Store (`chat-store.ts`):**
- State: `messages[]`, `isTyping`
- **NOT persisted** (privacy — chat mode is ephemeral)
- Rolling limit: last 10 messages only
- Actions: `addMessage()`, `clearMessages()`, `setIsTyping()`

**Agent Store (`agent-store.ts`):**
- State: `messages[]`, `memory` (userProfile, patterns, preferences), `isTyping`, `isLearning`
- **Persisted** to localStorage (`claws-agent`)
- Full message history, no limit
- Actions: `addMessage()`, `clearMessages()`, `updateMemory()`, `setIsTyping()`, `toggleLearning()`

**Message Types (`message.ts`):**
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

| **Commit** | `feat: add Zustand stores with persistence` |
|---|---|
| **Time** | ~25 min |

---

### Task 1.5 · UI Components

| | |
|---|---|
| **What** | Build all reusable components for the MVP |

**Components to create:**

| Component | File | Description |
|-----------|------|-------------|
| `ModeSwitcher` | `src/components/ModeSwitcher.tsx` | Toggle button with contextual icon/label, aria-label |
| `Message` | `src/components/Message.tsx` | Mode-aware message bubble with timestamp, gradient styling |
| `ChatInput` | `src/components/ChatInput.tsx` | Auto-expanding textarea, Enter to send, Shift+Enter newline, send button with disabled states |

| **Commit** | `feat: add reusable UI components` |
|---|---|
| **Time** | ~30 min |

---

### Task 1.6 · Chat Mode View

| | |
|---|---|
| **What** | Create `src/components/ChatMode.tsx` — complete chat mode experience |
| **Key Details** | Glassmorphism header with "Chat Mode" / "No memory, quick conversations" subtitle. Animated empty state with icon. Auto-scroll on new messages. Typing indicator (3 bouncing dots). Simulated AI response (will be replaced with real provider in Phase 2). Glass-panel input area. |
| **Commit** | `feat: add Chat Mode view with glass theme` |
| **Time** | ~20 min |

---

### Task 1.7 · Agent Mode View + Memory Sidebar

| | |
|---|---|
| **What** | Create `src/components/AgentMode.tsx` and `src/components/MemorySidebar.tsx` |
| **Key Details** | Dark depth-panel header with learning indicator (glow dot). Ambient glow background effect. Memory sidebar (280px) with: learning toggle, stats grid (patterns/preferences counts), user profile section, recent patterns list. Simulated AI response with learning-aware messaging. |
| **Commit** | `feat: add Agent Mode view with memory sidebar` |
| **Time** | ~30 min |

---

### Task 1.8 · App Shell + Keyboard Shortcuts

| | |
|---|---|
| **What** | Create `src/App.tsx`, `src/main.tsx`, `src/hooks/useKeyboardShortcuts.ts` |
| **Key Details** | App shell: title bar with logo (gradient icon), app name, mode label, keyboard shortcut hint (`⌘M`), ModeSwitcher. Dark class toggle for agent mode. `useKeyboardShortcuts` hook: `Cmd/Ctrl+M` to toggle mode, ignores input fields. |
| **Commit** | `feat: create App shell with mode switching and keyboard shortcuts` |
| **Time** | ~20 min |

---

### Task 1.9 · Barrel Exports + First Run Verification

| | |
|---|---|
| **What** | Create index.ts barrel exports for `components/`, `stores/`, `hooks/`. Run `npm run dev` and `npm run electron:dev`. Create `electron-builder.yml`. |
| **Verification** | App opens → mode switching works → both modes render with correct themes → messages send & display → typing indicator animates → keyboard shortcut works → sidebar shows in agent mode → mode persists across page reload |
| **Commit** | `chore: add barrel exports and verify MVP builds correctly` |
| **Time** | ~20 min |

---

### Phase 1 Summary

| Metric | Target |
|--------|--------|
| Tasks | 9 tasks |
| Time | ~3.5 hours |
| Milestone | Running app with 2 premium-looking modes |

---

## Phase 2 — Core Features (Weeks 2–3)

> **Goal:** Real AI integration, persistent storage, skills system, multi-provider support, onboarding

---

### Task 2.1 · OpenAI Provider Integration

| | |
|---|---|
| **What** | Create `src/utils/aiProvider.ts` — function `sendToAI(messages, mode)` calling OpenAI API. Create `src/stores/provider-store.ts` — stores API key + selected model. Wire into both modes' `handleSend()`. |
| **Key Details** | Chat mode: `temperature: 0.7`, `max_tokens: ~1000`. Agent mode: `temperature: 0.3`, `max_tokens: ~4000`. Provider adapter pattern for extensibility. |
| **Commit** | `feat: integrate OpenAI as first AI provider` |
| **Time** | ~30 min |

---

### Task 2.2 · SQLite Database Setup

| | |
|---|---|
| **What** | Install `better-sqlite3`. Create `src/utils/database.ts` — `initDatabase()` creates tables: `conversations`, `memory`, `patterns`, `skills`, `providers` |
| **Key Details** | DB path: `~/Library/Application Support/Claws/claws_memory.db` (Mac), `%APPDATA%/Claws/` (Windows). API keys stored encrypted. |
| **Commit** | `feat: add SQLite database initialization` |
| **Time** | ~25 min |

---

### Task 2.3 · Memory System (Agent Mode)

| | |
|---|---|
| **What** | Create `src/utils/memoryManager.ts` — CRUD for memory table. Migrate agent store from localStorage to SQLite-backed persistence. |
| **Commit** | `feat: implement persistent memory system` |
| **Time** | ~30 min |

---

### Task 2.4 · Session Persistence

| | |
|---|---|
| **What** | Create `src/utils/sessionManager.ts` — save/load agent sessions. Auto-save on each message. Load last session on startup. |
| **Commit** | `feat: add session persistence for Agent mode` |
| **Time** | ~20 min |

---

### Task 2.5 · Multi-Provider Support (Anthropic)

| | |
|---|---|
| **What** | Extend `aiProvider.ts` with provider adapter pattern: `OpenAIAdapter`, `AnthropicAdapter`. Store configs in SQLite `providers` table. |
| **Commit** | `feat: add multi-provider support (Anthropic)` |
| **Time** | ~30 min |

---

### Task 2.6 · Provider Settings UI

| | |
|---|---|
| **What** | Create `src/components/ProviderSettings.tsx` — list providers, API key inputs (password type), model selector, "Test Connection" button, active provider radio |
| **Commit** | `feat: add provider settings UI` |
| **Time** | ~30 min |

---

### Task 2.7 · Settings Page

| | |
|---|---|
| **What** | Create `src/components/Settings.tsx` — tabbed UI: Providers, Appearance, Data (export/import/clear memory), About. Gear icon in header to open. |
| **Commit** | `feat: add Settings page with tabs` |
| **Time** | ~30 min |

---

### Task 2.8 · Skills System Foundation

| | |
|---|---|
| **What** | Create `src/utils/skillsManager.ts` — `loadSkills()` from skills directory, `executeSkill()` dispatcher. Skill interface: `id`, `name`, `description`, `triggers[]`, `handler`, `isActive`. |
| **Key Details** | Skills stored at `~/Library/Application Support/Claws/skills/`. Include 2 built-in skills: `writing-assistant`, `task-planning`. |
| **Commit** | `feat: add skills system with built-in skills` |
| **Time** | ~40 min |

---

### Task 2.9 · Skills UI + Memory Viewer in Sidebar

| | |
|---|---|
| **What** | Create `src/components/SkillsList.tsx` (toggle enable/disable, skill info) and `src/components/MemoryViewer.tsx` (expandable tree, clear/export buttons). Add both to Agent Mode sidebar. |
| **Commit** | `feat: add skills list and memory viewer to sidebar` |
| **Time** | ~35 min |

---

### Task 2.10 · Onboarding Wizard

| | |
|---|---|
| **What** | Create `src/components/Onboarding.tsx` — 5-step wizard: Welcome → Mode Explanation → Provider Setup → Permissions → Ready. Track completion in localStorage. Show only on first launch. |
| **Commit** | `feat: add onboarding wizard` |
| **Time** | ~35 min |

---

### Phase 2 Summary

| Metric | Target |
|--------|--------|
| Tasks | 10 tasks |
| Time | ~5 hours |
| Milestone | Real AI, persistent memory, skills, onboarding |

---

## Phase 3 — Self-Learning Framework (Week 4)

> **Goal:** The AI learns and improves over time

---

### Task 3.1 · Reflection Engine

| | |
|---|---|
| **What** | Create `self-learning/reflection/reflectionEngine.ts` — `reflectOnInteraction()` extracts lessons, identifies patterns, stores reflections in SQLite. Runs after each agent interaction. |
| **Commit** | `feat: add reflection engine` |
| **Time** | ~30 min |

---

### Task 3.2 · Pattern Recognition

| | |
|---|---|
| **What** | Create `self-learning/patterns/patternRecognizer.ts` — `identifyPatterns()` matches interactions against known patterns, detects new patterns after 3+ occurrences, tracks frequency. |
| **Commit** | `feat: add pattern recognition system` |
| **Time** | ~30 min |

---

### Task 3.3 · Skill Evolution

| | |
|---|---|
| **What** | Create `self-learning/evolution/skillEvolver.ts` — `evolveSkill()` monitors success rate, generates improvements when below 85%, tests before deploying. |
| **Commit** | `feat: add skill evolution system` |
| **Time** | ~30 min |

---

### Task 3.4 · Learning UI (Status Bar + Notifications)

| | |
|---|---|
| **What** | Update Agent Mode status bar with real learning metrics. Add toast notification component for pattern discovery / skill evolution events. |
| **Commit** | `feat: add learning indicators and notifications` |
| **Time** | ~30 min |

---

### Phase 3 Summary

| Metric | Target |
|--------|--------|
| Tasks | 4 tasks |
| Time | ~2 hours |
| Milestone | Self-improving AI with visible learning |

---

## Phase 4 — Polish & Distribution (Week 5)

> **Goal:** Production-ready app with great UX

---

### Task 4.1 · UI Refinements

| | |
|---|---|
| **What** | Chat Mode: message bubbles with timestamps, typing indicator, smooth scroll, proper fonts, responsive. Agent Mode: dark gradients, action indicators, collapsible sidebar, code syntax highlighting, markdown rendering. Mode transitions: background fade, sidebar slide, status bar appear/disappear. |
| **Commit** | `style: polish both modes with animations` |
| **Time** | ~45 min |

---

### Task 4.2 · Performance Optimization

| | |
|---|---|
| **What** | Lazy load Agent Mode components, memoize message list, debounce typing, virtualize long lists. |
| **Targets** | Chat <200MB RAM · Agent <800MB · Startup <3s · Mode switch <1s |
| **Commit** | `refactor: optimize performance` |
| **Time** | ~25 min |

---

### Task 4.3 · Security (API Key Encryption)

| | |
|---|---|
| **What** | Encrypt API keys using `electron-safeStorage` before storing in SQLite. Decrypt on read. |
| **Commit** | `feat: add API key encryption` |
| **Time** | ~20 min |

---

### Task 4.4 · Data Export/Import

| | |
|---|---|
| **What** | Full data export (memory, patterns, sessions, settings) to JSON. Import with merge/replace option. |
| **Commit** | `feat: add data export/import` |
| **Time** | ~20 min |

---

### Task 4.5 · Documentation

| | |
|---|---|
| **What** | Complete `README.md`: installation, usage, modes, provider setup. JSDoc on all public functions. |
| **Commit** | `docs: add README and inline documentation` |
| **Time** | ~30 min |

---

### Task 4.6 · Build & Distribution

| | |
|---|---|
| **What** | Mac build (`npm run dist:mac`): test DMG, verify icon, auto-update. Windows build (`npm run dist:win`): test NSIS installer, portable exe. |
| **Commit** | `chore: verify builds and distribution` |
| **Time** | ~30 min |

---

### Task 4.7 · Full Test Suite

| | |
|---|---|
| **What** | Complete testing checklist from SPECS |
| **Functional** | Mode switching, memory persistence, skills, providers, patterns |
| **UX** | Onboarding, settings, memory viewer, export/import |
| **Performance** | Response times, memory usage, CPU, startup time, no memory leaks |
| **Commit** | `test: complete test suite validation` |
| **Time** | ~30 min |

---

### Phase 4 Summary

| Metric | Target |
|--------|--------|
| Tasks | 7 tasks |
| Time | ~3.5 hours |
| Milestone | Production-ready app |

---

## Verification Plan

### Per-Phase Automated Checks

```bash
npm run build          # compiles without errors (every phase)
npm run dev            # Vite server starts (every phase)
npm run electron:dev   # Electron window opens with React (every phase)
npm run dist:mac       # produces DMG + ZIP (Phase 4)
```

### Per-Phase Manual Verification

| Phase | Checklist |
|-------|-----------|
| **1 — MVP** | App opens → switch modes → both render correctly → messages send → typing indicator → keyboard shortcut `⌘M` → mode persists on reload → themes are visually distinct |
| **2 — Core** | Restart app → memory persists → add/check providers → run onboarding → toggle skills → settings page works |
| **3 — Learning** | Send 5+ similar requests → patterns detected → reflection log populated → skill metrics tracked |
| **4 — Polish** | Full UX walkthrough → startup <3s → RAM within targets → export/import works → install from DMG/EXE |

---

## Grand Summary

| Phase | Tasks | Est. Time | Key Milestone |
|-------|-------|-----------|---------------|
| **1 — MVP** | 9 | ~3.5 hours | Running app with 2 premium modes |
| **2 — Core** | 10 | ~5 hours | AI, memory, skills, onboarding |
| **3 — Learning** | 4 | ~2 hours | Self-improving AI |
| **4 — Polish** | 7 | ~3.5 hours | Production-ready |
| **Total** | **30 tasks** | **~14 hours** | **Complete Claws Desktop App** |

---

## Appendix: What Each Original Plan Contributed

| Aspect | Plan A (`implementation_plan.md.resolved`) | Plan B (`2026-02-15-claws-desktop-mvp.md`) | **This Plan** |
|--------|----|----|-----|
| **Phase structure** | 4 phases, 42 tasks | 4 phases, 15 tasks (MVP) | 4 phases, 30 tasks (right-sized) |
| **Granularity** | Over-granular (separate tasks for each store) | Grouped logically | Grouped logically, expand where needed |
| **Code samples** | None — descriptions only | Full copy-paste code for every file | Key configs inline, code during execution |
| **Styling** | Vanilla CSS (`styles.css`) | TailwindCSS with custom palette | ✅ TailwindCSS (modern, maintainable) |
| **Typography** | Inter + Fira Code (generic) | Plus Jakarta Sans + JetBrains Mono | ✅ Plus Jakarta Sans + JetBrains Mono |
| **Colors** | Spec colors (`#4A90E2`, `#2ECC71`) | Refined palette with surfaceAlt, glow | ✅ Refined palette |
| **Title bar** | Standard Electron | Frameless with `hiddenInset` + drag regions | ✅ Frameless native feel |
| **Design quality** | Basic functional | Premium with glassmorphism/depth panels | ✅ Premium aesthetic |
| **Full roadmap** | ✅ Through Phase 4 (Polish + Distribution) | MVP only, defers Phase 2+ | ✅ Full 4-phase roadmap |
| **Self-learning** | ✅ Detailed (reflection, patterns, evolution) | Deferred | ✅ Included in Phase 3 |
| **AI Provider** | ✅ OpenAI + Anthropic | Deferred (simulated) | ✅ Phase 2 |
| **SQLite** | ✅ Phase 2 | Deferred | ✅ Phase 2 |
| **Skills** | ✅ Phase 2 | Deferred | ✅ Phase 2 |
