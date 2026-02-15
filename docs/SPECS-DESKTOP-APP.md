# CLAWS Desktop App - Technical Specification

**Version:** 1.0
**Target:** Claude Code CLI for implementation
**Goal:** Build complete desktop app from this spec

---

## 🎯 PRODUCT OVERVIEW

### What We're Building
A desktop application that gives everyone their own personal AI assistant that:
- Runs 100% locally on user's machine
- Has two distinct modes (Chat & Agent)
- Learns and improves over time
- Uses user's hardware for everything
- Easy to install and setup

### Key Differentiators
- **Two-Mode System** (Chat vs Agent) - solves context window problem
- **Self-Improving** (gets better over time)
- **100% Local** (privacy-first, no cloud needed)
- **Personal** (adapts to each user)
- **Simple** (non-technical users can use it)

---

## 🏗️ ARCHITECTURE

### Tech Stack
```
Desktop Framework: Electron
UI Framework: React + TypeScript
State Management: Zustand
Styling: TailwindCSS
Backend: Node.js
Database: SQLite (local)
AI Runtime: OpenClaw (embedded)
```

### Directory Structure
```
claws-desktop/
├── electron/           # Main process
│   ├── main.ts        # Entry point
│   ├── preload.ts     # Bridge to renderer
│   └── ipc/           # Inter-process communication
│
├── src/               # React app (renderer)
│   ├── App.tsx
│   ├── components/
│   │   ├── ChatMode/
│   │   ├── AgentMode/
│   │   ├── ModeSwitcher/
│   │   └── common/
│   ├── hooks/
│   ├── stores/        # Zustand stores
│   └── utils/
│
├── openclaw/          # OpenClaw core (embedded)
│   ├── skills/
│   ├── plugins/
│   ├── providers/
│   └── memory/
│
├── self-learning/     # Our framework
│   ├── reflection/
│   ├── patterns/
│   ├── evolution/
│   └── optimizer/
│
└── resources/
    ├── icons/
    └── assets/
```

---

## 🔄 MODE SYSTEM (Core Feature)

### Chat Mode

**Purpose:** Quick, lightweight conversations without overhead

**Technical Behavior:**
```typescript
interface ChatMode {
  memory: "minimal";        // Only last 10 messages
  learning: false;          // Don't store preferences
  tools: [];                // No tools available
  contextLimit: 4000;       // Small context window
  temperature: 0.7;         // More creative
  persistence: false;       // Don't save conversations
}
```

**UI Layout:**
- Simple chat interface
- No toolbars
- No status indicators
- Light theme
- Clean, minimal design

**State Management:**
```typescript
const useChatMode = create((set) => ({
  messages: [],             // Last 10 only
  mode: 'chat',
  isLearning: false,
  hasMemory: false,
  
  sendMessage: (text) => {
    // Send to AI without memory storage
    // Response is generated fresh each time
  },
  
  clearChat: () => {
    // Wipe all messages
    set({ messages: [] });
  }
}));
```

---

### Agent Mode

**Purpose:** Full-power AI with learning and actions

**Technical Behavior:**
```typescript
interface AgentMode {
  memory: "full";           // Complete memory system
  learning: true;           // Active learning enabled
  tools: ["files", "web", "apps", "database"];
  contextLimit: 200000;     // Large context window
  temperature: 0.3;         // More focused
  persistence: true;        // Save everything
}
```

**UI Layout:**
- Rich chat interface
- Toolbars with actions
- Status indicators
- Memory viewer
- Skills list
- Actions log
- Dark theme (or custom)

**State Management:**
```typescript
const useAgentMode = create((set, get) => ({
  messages: [],             // Full history
  mode: 'agent',
  isLearning: true,
  hasMemory: true,
  
  memory: {
    userProfile: {},
    patterns: [],
    preferences: {},
    skills: []
  },
  
  sendMessage: async (text) => {
    // 1. Send to AI with full context
    // 2. AI has access to all tools
    // 3. Learning system active
    // 4. Store in memory
    // 5. Update patterns
  },
  
  learnFromInteraction: (data) => {
    // Extract patterns
    // Update preferences
    // Evolve skills
  }
}));
```

---

## 🎨 USER INTERFACE

### Main Window Layout

```
┌─────────────────────────────────────────────────────┐
│ Menu Bar                                            │
│ [File] [Edit] [View] [Mode] [Help]                 │
├─────────────────────────────────────────────────────┤
│ Title Bar                                           │
│ 🤖 Claws - Agent Mode           [💬Switch to Chat] │
├─────────────────────────────────────────────────────┤
│ Status Bar (Agent Mode Only)                        │
│ Status: Ready | Memory: 45% | Learning: ON | Tools │
├─────────────────────────────────────────────────────┤
│ Main Chat Area                                      │
│                                                     │
│ [Scrollable message history]                        │
│                                                     │
│ User: [timestamp]                                   │
│ Message content...                                  │
│                                                     │
│ Claws: [timestamp] [mode badge]                     │
│ Response content...                                 │
│ [Action indicators if in Agent Mode]               │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Input Area                                          │
│ [Attach] [Voice] [Type message...        ] [Send]  │
└─────────────────────────────────────────────────────┘
```

### Sidebar (Agent Mode Only)

```
┌─────────────────┐
│ 📁 Memory       │
│  ├─ Profile     │
│  ├─ Patterns    │
│  └─ Preferences │
├─────────────────┤
│ 🔧 Skills       │
│  ├─ Active (5)  │
│  └─ Available   │
├─────────────────┤
│ ⚙️ Settings     │
│  ├─ Mode        │
│  ├─ Providers   │
│  └─ Data        │
└─────────────────┘
```

---

## 🔧 CORE FEATURES

### 1. Mode Switching

**Requirement:** Switch between Chat and Agent modes instantly

**Implementation:**
```typescript
// Mode switcher component
const ModeSwitcher = () => {
  const { mode, setMode } = useMode();
  
  return (
    <button 
      onClick={() => setMode(mode === 'chat' ? 'agent' : 'chat')}
      className="mode-switch"
    >
      {mode === 'chat' ? '🤖 Agent Mode' : '💬 Chat Mode'}
    </button>
  );
};

// Mode store
const useMode = create((set) => ({
  mode: 'chat', // default
  setMode: (newMode) => {
    // Save current state
    // Clear context if switching to chat
    // Load memory if switching to agent
    set({ mode: newMode });
  }
}));
```

**UX Requirements:**
- Switch happens in < 1 second
- Visual transition animation
- Mode always visible in title bar
- Keyboard shortcut: Cmd/Ctrl + M

---

### 2. Provider System

**Requirement:** Support multiple AI providers (OpenAI, Anthropic, etc.)

**Implementation:**
```typescript
interface Provider {
  id: string;
  name: string;
  apiKey: string;
  models: string[];
  isActive: boolean;
}

const defaultProviders: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiKey: '', // User provides
    models: ['gpt-4', 'gpt-3.5-turbo'],
    isActive: false
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKey: '', // User provides
    models: ['claude-3-opus', 'claude-3-sonnet'],
    isActive: false
  },
  // ... more providers
];

// Provider settings UI
const ProviderSettings = () => {
  const { providers, setApiKey, setActive } = useProviders();
  
  return (
    <div className="provider-settings">
      {providers.map(provider => (
        <div key={provider.id}>
          <h3>{provider.name}</h3>
          <input 
            type="password"
            placeholder="API Key"
            value={provider.apiKey}
            onChange={(e) => setApiKey(provider.id, e.target.value)}
          />
          <select>
            {provider.models.map(model => (
              <option key={model}>{model}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
```

**UX Requirements:**
- Settings → Providers menu
- Easy API key input
- Test connection button
- Clear active provider indicator

---

### 3. Memory System (Agent Mode Only)

**Requirement:** Persistent memory that learns from user

**Implementation:**
```typescript
interface Memory {
  userProfile: {
    name: string;
    preferences: Record<string, any>;
    communicationStyle: string;
    workContext: string;
  };
  
  patterns: {
    successPatterns: Pattern[];
    failurePatterns: Pattern[];
    workflowPatterns: Pattern[];
  };
  
  sessions: Session[];
  reflections: Reflection[];
}

// Memory stored in SQLite
const initDatabase = async () => {
  const db = new Database('claws_memory.db');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY,
      type TEXT,
      key TEXT,
      value TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY,
      type TEXT,
      pattern TEXT,
      occurrences INTEGER,
      last_seen DATETIME
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      mode TEXT,
      messages TEXT,
      learnings TEXT,
      timestamp DATETIME
    );
  `);
  
  return db;
};
```

**UX Requirements:**
- Memory viewer in sidebar
- Clear/export memory buttons
- Visual pattern indicators
- Learning progress display

---

### 4. Skills System

**Requirement:** Extensible skills like OpenClaw

**Implementation:**
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  handler: Function;
  isActive: boolean;
}

// Skills directory structure
const skillsDir = `${app.getPath('userData')}/skills/`;

const loadSkills = async () => {
  const skills = await fs.readdir(skillsDir);
  
  return skills.map(skillDir => {
    const skill = require(`${skillsDir}/${skillDir}/skill.js`);
    return {
      ...skill,
      handler: skill.execute
    };
  });
};

// Example skill
const fileOrganizationSkill = {
  id: 'file-organization',
  name: 'File Organization',
  description: 'Organizes files based on user preferences',
  triggers: ['organize files', 'sort files', 'clean up'],
  
  execute: async (context) => {
    // Skill logic
    // Learns from user's organizational preferences
    // Stores patterns for next time
  }
};
```

**Built-in Skills:**
- File Management
- Web Research
- Code Helper
- Writing Assistant
- Task Planning
- Learning Tracker

**UX Requirements:**
- Skills list in sidebar
- Enable/disable toggle
- Skill settings per skill
- Add custom skills button

---

### 5. Self-Learning Framework

**Requirement:** AI learns and improves over time

**Components:**

**A. Reflection Engine**
```typescript
const reflectOnInteraction = async (interaction) => {
  const reflection = {
    timestamp: new Date(),
    action: interaction.action,
    outcome: interaction.outcome,
    success: interaction.success,
    lessons: extractLessons(interaction),
    patterns: identifyPatterns(interaction)
  };
  
  // Store reflection
  await storeReflection(reflection);
  
  // Update patterns if found
  if (reflection.patterns.length > 0) {
    await updatePatterns(reflection.patterns);
  }
};
```

**B. Pattern Recognition**
```typescript
const identifyPatterns = (interaction) => {
  // Check if this matches known patterns
  const knownPatterns = loadPatterns();
  const matches = [];
  
  for (const pattern of knownPatterns) {
    if (matchesPattern(interaction, pattern)) {
      pattern.occurrences++;
      matches.push(pattern);
    }
  }
  
  // Check if this is a new pattern (3+ occurrences)
  if (isNewPattern(interaction)) {
    const newPattern = createPattern(interaction);
    matches.push(newPattern);
  }
  
  return matches;
};
```

**C. Skill Evolution**
```typescript
const evolveSkill = async (skillId) => {
  const skill = await loadSkill(skillId);
  const performance = await getSkillPerformance(skillId);
  
  if (performance.successRate < 0.85) {
    // Generate improvement
    const improvement = await generateImprovement(skill, performance);
    
    // Test improvement
    const testResults = await testImprovement(skill, improvement);
    
    if (testResults.improvement > 0.1) {
      // Deploy improvement
      await deploySkillUpdate(skillId, improvement);
    }
  }
};
```

**UX Requirements:**
- Learning indicators
- Pattern discovery notifications
- Skill evolution log
- Manual trigger for evolution

---

## 📦 DATA STORAGE

### Local Database Schema

```sql
-- Core tables
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  mode TEXT,
  messages TEXT, -- JSON
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE memory (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT,
  created_at DATETIME
);

CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  type TEXT,
  pattern TEXT, -- JSON
  occurrences INTEGER,
  last_seen DATETIME
);

CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT,
  config TEXT, -- JSON
  is_active BOOLEAN
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT,
  api_key TEXT, -- encrypted
  is_active BOOLEAN
);
```

### File Structure
```
~/Library/Application Support/Claws/ (Mac)
%APPDATA%/Claws/ (Windows)

├── claws_memory.db
├── config.json
├── skills/
│   ├── file-management/
│   │   └── skill.js
│   └── ...
├── memory/
│   ├── reflections/
│   ├── patterns/
│   └── sessions/
└── cache/
    └── temp/
```

---

## 🚀 INSTALLATION & SETUP

### Onboarding Flow

**Step 1: Welcome**
```
┌─────────────────────────────┐
│      Welcome to Claws!      │
│                             │
│  Your personal AI that      │
│  learns from you.           │
│                             │
│  [Get Started]              │
└─────────────────────────────┘
```

**Step 2: Mode Explanation**
```
┌─────────────────────────────┐
│  Choose Your Mode           │
│                             │
│  💬 Chat Mode               │
│  Quick conversations,       │
│  no memory, private         │
│  [Select]                   │
│                             │
│  🤖 Agent Mode              │
│  Full power, learns from    │
│  you, takes actions         │
│  [Select]                   │
│                             │
│  [Start with Chat, switch   │
│   to Agent later]           │
└─────────────────────────────┘
```

**Step 3: Provider Setup**
```
┌─────────────────────────────┐
│  Choose AI Provider         │
│                             │
│  ○ OpenAI                   │
│    [Enter API Key]          │
│                             │
│  ○ Anthropic                │
│    [Enter API Key]          │
│                             │
│  ○ Use Local Model          │
│    (No API key needed)      │
│                             │
│  [Continue] [Skip for now]  │
└─────────────────────────────┘
```

**Step 4: Permissions (Agent Mode)**
```
┌─────────────────────────────┐
│  Grant Permissions          │
│                             │
│  Agent Mode needs access to:│
│                             │
│  ☑️ Files (read/write)      │
│  ☑️ Memory (learn from you) │
│  ☐ Web Access               │
│  ☐ Run Applications         │
│                             │
│  [Grant & Continue]         │
└─────────────────────────────┘
```

**Step 5: Ready**
```
┌─────────────────────────────┐
│  ✅ All Set!                │
│                             │
│  You're ready to start.     │
│                             │
│  Quick tips:                │
│  • Switch modes anytime     │
│  • Agent mode learns        │
│  • Chat mode is private     │
│                             │
│  [Start Using Claws]        │
└─────────────────────────────┘
```

---

## 🎨 VISUAL DESIGN

### Color Palette

**Chat Mode:**
```css
--chat-primary: #4A90E2;      /* Blue */
--chat-secondary: #7B68EE;    /* Purple */
--chat-background: #F5F5F5;   /* Light gray */
--chat-text: #333333;         /* Dark gray */
```

**Agent Mode:**
```css
--agent-primary: #2ECC71;     /* Green */
--agent-secondary: #27AE60;   /* Dark green */
--agent-background: #1E1E1E;  /* Dark gray */
--agent-text: #E0E0E0;        /* Light gray */
```

### Typography
```css
--font-primary: 'Inter', sans-serif;
--font-mono: 'Fira Code', monospace;

--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
```

---

## 🔐 SECURITY & PRIVACY

### Data Handling
- **Chat Mode:** No data stored after session ends
- **Agent Mode:** All data stays on user's machine
- **API Keys:** Encrypted in local storage
- **Memory:** User can export/delete anytime

### Permissions
```typescript
const permissions = {
  chat: {
    files: false,
    memory: false,
    web: false,
    apps: false
  },
  
  agent: {
    files: true,   // User grants
    memory: true,  // User grants
    web: true,     // User grants
    apps: true     // User grants
  }
};
```

---

## 📊 PERFORMANCE TARGETS

### Response Times
- Chat Mode: < 2 seconds
- Agent Mode: < 5 seconds
- Mode Switch: < 1 second

### Resource Usage
- Memory (Chat): < 200MB
- Memory (Agent): < 800MB
- CPU: < 10% idle, < 50% active

### App Size
- Download: < 150MB
- Installed: < 500MB
- Memory DB: < 100MB typical

---

## 🧪 TESTING CHECKLIST

### Functionality Tests
- [ ] Mode switching works
- [ ] Chat mode has no memory
- [ ] Agent mode remembers everything
- [ ] Skills load and execute
- [ ] Providers connect properly
- [ ] Memory persists across restarts
- [ ] Learning improves over time
- [ ] Patterns are detected
- [ ] Skills evolve

### UX Tests
- [ ] Install is simple
- [ ] Onboarding is clear
- [ ] Mode is always visible
- [ ] Switching is instant
- [ ] Settings are easy
- [ ] Memory viewer works
- [ ] Export/import works

### Performance Tests
- [ ] Response times met
- [ ] Memory usage acceptable
- [ ] CPU usage acceptable
- [ ] App starts in < 3 seconds
- [ ] No memory leaks

---

## 📦 BUILD & DISTRIBUTION

### Mac Build
```bash
# Build for Mac
npm run build:mac

# Output:
# - Claws-1.0.0.dmg
# - Claws-1.0.0-mac.zip
```

### Windows Build
```bash
# Build for Windows
npm run build:win

# Output:
# - Claws Setup 1.0.0.exe
# - Claws-1.0.0-win.exe
```

### Auto-Update
```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1 (MVP)
1. ✅ Basic Electron app
2. ✅ Two modes (Chat/Agent)
3. ✅ Mode switching
4. ✅ Basic UI
5. ✅ One provider (OpenAI)

**Timeline:** 1 week

### Phase 2 (Core Features)
1. ⬜ Memory system
2. ⬜ Skills system
3. ⬜ Multiple providers
4. ⬜ Onboarding wizard
5. ⬜ Settings UI

**Timeline:** 2 weeks

### Phase 3 (Learning)
1. ⬜ Reflection engine
2. ⬜ Pattern recognition
3. ⬜ Skill evolution
4. ⬜ Learning UI
5. ⬜ Memory viewer

**Timeline:** 1 week

### Phase 4 (Polish)
1. ⬜ UI refinements
2. ⬜ Performance optimization
3. ⬜ Documentation
4. ⬜ Distribution setup
5. ⬜ Testing

**Timeline:** 1 week

---

## 📝 IMPLEMENTATION NOTES

### For Claude Code:
1. Start with Electron + React template
2. Implement mode switching first
3. Add OpenClaw integration
4. Build UI components
5. Add self-learning layer
6. Polish and test

### Key Integration Points:
1. OpenClaw runs as embedded process
2. Skills system loads from file system
3. Memory stored in SQLite
4. UI communicates via IPC
5. Learning happens in background

---

## ✅ SUCCESS CRITERIA

**User Experience:**
- Non-technical user can install in 2 minutes
- Mode switching is intuitive
- Learning is visible within 1 week
- App feels fast and responsive

**Technical:**
- All OpenClaw features work
- Self-learning framework integrated
- Performance targets met
- No critical bugs

**Distribution:**
- Mac app works on macOS 10.15+
- Windows app works on Windows 10+
- Auto-update works
- User support is sustainable

---

*This specification is complete*
*Ready for Claude Code implementation*
*All requirements documented*
