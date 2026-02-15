# Claws Desktop MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal viable desktop app with Electron + React + TypeScript featuring two modes (Chat and Agent) that can switch instantly.

**Architecture:** Electron main process handles native OS integration and spawns React renderer. State management via Zustand with localStorage persistence. TailwindCSS for styling with CSS custom properties for theming. Clean component composition with hooks for logic reuse.

**Tech Stack:** Electron 28, React 18, TypeScript 5, Zustand 4, TailwindCSS 3, Vite 5

**Design Direction (per frontend-design skill):**
- **Tone**: Refined dual-personality - Chat is warm/inviting with soft gradients, Agent is focused/technical with depth
- **Typography**: JetBrains Mono for code feel (not Inter/Roboto), Plus Jakarta Sans for clean UI
- **Differentiation**: The mode switch isn't just color - it's a complete atmosphere change with subtle animations
- **Avoid**: Generic purple gradients, Inter/Roboto fonts, cookie-cutter component styling

---

## Phase 1: Project Foundation

### Task 1: Initialize Project Structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `.gitignore`

**Step 1: Create package.json with all dependencies**

```json
{
  "name": "claws-desktop",
  "version": "0.1.0",
  "private": true,
  "description": "Personal AI assistant with two modes",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && npm run build:electron",
    "build:electron": "tsc -p tsconfig.node.json",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "concurrently": "^8.2.0",
    "electron": "^28.1.0",
    "electron-builder": "^24.9.1",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "wait-on": "^7.2.0"
  }
}
```

**Step 2: Create tsconfig.json for renderer**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create tsconfig.node.json for Electron main**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist-electron"
  },
  "include": ["electron"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

**Step 5: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Chat mode: warm, inviting, soft
        chat: {
          primary: '#3B82F6',    // Clear blue
          secondary: '#8B5CF6',  // Soft purple
          accent: '#F59E0B',     // Warm amber for highlights
          bg: '#FAFBFC',         // Off-white with warmth
          surface: '#FFFFFF',
          text: '#1F2937',
          muted: '#6B7280',
          border: '#E5E7EB',
        },
        // Agent mode: technical, deep, focused
        agent: {
          primary: '#10B981',    // Vibrant emerald
          secondary: '#059669',  // Deep emerald
          accent: '#06B6D4',     // Cyan for alerts
          bg: '#0C0C0C',         // Near black
          surface: '#161616',    // Elevated surface
          surfaceAlt: '#1F1F1F', // Higher elevation
          text: '#F3F4F6',
          muted: '#9CA3AF',
          border: '#262626',
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
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
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

**Step 6: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com" />
    <title>Claws</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 8: Create .gitignore**

```
# Dependencies
node_modules/

# Build output
dist/
dist-electron/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Electron
release/
```

**Step 9: Install dependencies**

Run: `npm install`
Expected: All dependencies installed successfully

**Step 10: Commit**

```bash
git init
git add .
git commit -m "chore: initialize project with Electron + React + TypeScript + Tailwind

- Configure TypeScript for renderer and main process
- Set up Vite for React with path aliases
- Configure Tailwind with custom color palette for chat/agent modes
- Add development and build scripts for Electron"
```

---

### Task 2: Create Electron Main Process

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

**Step 1: Create electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});
```

**Step 2: Create electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getTheme: () => Promise<'dark' | 'light'>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => () => void;
}

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getTheme: () => ipcRenderer.invoke('get-theme'),

  onThemeChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, theme: 'dark' | 'light') => {
      callback(theme);
    };
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld('electron', electronAPI);
```

**Step 3: Create type declaration for renderer**

Create: `src/types/electron.d.ts`

```typescript
import type { ElectronAPI } from '../../electron/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
```

**Step 4: Commit**

```bash
git add electron/ src/types/electron.d.ts
git commit -m "feat: add Electron main process with IPC handlers

- Create BrowserWindow with security-focused webPreferences
- Expose safe API via preload script with TypeScript types
- Handle app lifecycle (ready, activate, window-all-closed)
- Add IPC handlers for version, platform, and theme detection"
```

---

### Task 3: Create Base Styles

**Files:**
- Create: `src/index.css`

**Step 1: Create base CSS with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Chat mode CSS variables */
    --gradient-chat: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EDE9FE 100%);
    --gradient-chat-surface: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);

    /* Agent mode CSS variables */
    --gradient-agent: radial-gradient(ellipse at top, #0C0C0C 0%, #000000 100%);
    --gradient-agent-glow: radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 50%);
  }

  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
  }

  /* Dark mode scrollbar */
  .dark ::-webkit-scrollbar-thumb {
    @apply bg-zinc-700;
  }

  .dark ::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-600;
  }

  /* Selection styling */
  ::selection {
    @apply bg-chat-primary/30 text-chat-text;
  }

  .dark ::selection {
    @apply bg-agent-primary/30 text-agent-text;
  }
}

@layer components {
  /* Glass morphism panel for chat mode */
  .glass-panel {
    @apply bg-white/80 backdrop-blur-xl border border-white/20;
  }

  /* Subtle depth panel for agent mode */
  .depth-panel {
    @apply bg-agent-surface border border-agent-border;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 4px 24px rgba(0, 0, 0, 0.3);
  }

  /* Focus ring utility */
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  }

  /* Button base styles */
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2
           font-medium rounded-lg transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           active:scale-[0.98];
  }

  /* Input base styles with mode awareness */
  .input-chat {
    @apply w-full px-4 py-3 rounded-xl
           bg-chat-surface border border-chat-border
           text-chat-text placeholder-chat-muted
           focus:outline-none focus:ring-2 focus:ring-chat-primary/50 focus:border-chat-primary
           transition-all duration-200;
  }

  .input-agent {
    @apply w-full px-4 py-3 rounded-xl
           bg-agent-surfaceAlt border border-agent-border
           text-agent-text placeholder-agent-muted
           focus:outline-none focus:ring-2 focus:ring-agent-primary/50 focus:border-agent-primary
           transition-all duration-200;
  }
}

@layer utilities {
  /* Drag region for frameless windows */
  .drag-region {
    -webkit-app-region: drag;
  }

  .no-drag {
    -webkit-app-region: no-drag;
  }

  /* Text gradient utility */
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r;
  }

  /* Smooth transitions for mode switching */
  .mode-transition {
    @apply transition-colors duration-300 ease-in-out;
  }
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: add base Tailwind styles with custom components

- Configure scrollbar styling for light/dark modes
- Add reusable button and input component classes
- Add drag region utilities for frameless window"
```

---

## Phase 2: State Management

### Task 4: Create Mode Store

**Files:**
- Create: `src/stores/mode-store.ts`

**Step 1: Create the mode store with Zustand**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Mode = 'chat' | 'agent';

interface ModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: 'chat',

      setMode: (mode) => {
        const previousMode = get().mode;
        if (previousMode !== mode) {
          set({ mode });
        }
      },

      toggleMode: () => {
        set((state) => ({
          mode: state.mode === 'chat' ? 'agent' : 'chat',
        }));
      },
    }),
    {
      name: 'claws-mode',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks for better performance
export const useMode = () => useModeStore((state) => state.mode);
export const useModeActions = () => useModeStore((state) => ({
  setMode: state.setMode,
  toggleMode: state.toggleMode,
}));
```

**Step 2: Commit**

```bash
git add src/stores/mode-store.ts
git commit -m "feat: add mode store with localStorage persistence

- Create Zustand store for chat/agent mode state
- Persist mode preference to localStorage
- Add selector hooks for optimized component re-renders"
```

---

### Task 5: Create Chat Store

**Files:**
- Create: `src/types/message.ts`
- Create: `src/stores/chat-store.ts`

**Step 1: Create message types**

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type NewMessage = Omit<Message, 'id' | 'timestamp'>;
```

**Step 2: Create chat store**

```typescript
import { create } from 'zustand';
import type { Message, NewMessage } from '../types/message';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (message: NewMessage) => void;
  clearMessages: () => void;
  setIsTyping: (isTyping: boolean) => void;
}

// Generate unique ID without external dependencies
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const MAX_MESSAGES = 10;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage].slice(-MAX_MESSAGES),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setIsTyping: (isTyping) => {
    set({ isTyping });
  },
}));

// Selector hooks
export const useChatMessages = () => useChatStore((state) => state.messages);
export const useChatIsTyping = () => useChatStore((state) => state.isTyping);
export const useChatActions = () => useChatStore((state) => ({
  addMessage: state.addMessage,
  clearMessages: state.clearMessages,
  setIsTyping: state.setIsTyping,
}));
```

**Step 3: Commit**

```bash
git add src/types/message.ts src/stores/chat-store.ts
git commit -m "feat: add chat store with message limit

- Create message type definitions
- Implement chat store with 10-message rolling limit
- Add typing indicator state
- Generate unique IDs without external dependencies"
```

---

### Task 6: Create Agent Store

**Files:**
- Create: `src/stores/agent-store.ts`

**Step 1: Create agent store with persistence**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Message, NewMessage } from '../types/message';

interface UserProfile {
  name: string;
  preferences: Record<string, unknown>;
  communicationStyle: string;
}

interface Memory {
  userProfile: UserProfile;
  patterns: Array<{
    id: string;
    type: string;
    description: string;
    occurrences: number;
    lastSeen: number;
  }>;
  preferences: Record<string, unknown>;
}

interface AgentState {
  messages: Message[];
  memory: Memory;
  isTyping: boolean;
  isLearning: boolean;
  addMessage: (message: NewMessage) => void;
  clearMessages: () => void;
  updateMemory: (updates: Partial<Memory>) => void;
  setIsTyping: (isTyping: boolean) => void;
  toggleLearning: () => void;
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const defaultMemory: Memory = {
  userProfile: {
    name: '',
    preferences: {},
    communicationStyle: 'professional',
  },
  patterns: [],
  preferences: {},
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      messages: [],
      memory: defaultMemory,
      isTyping: false,
      isLearning: true,

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      updateMemory: (updates) => {
        set((state) => ({
          memory: { ...state.memory, ...updates },
        }));
      },

      setIsTyping: (isTyping) => {
        set({ isTyping });
      },

      toggleLearning: () => {
        set((state) => ({ isLearning: !state.isLearning }));
      },
    }),
    {
      name: 'claws-agent',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks
export const useAgentMessages = () => useAgentStore((state) => state.messages);
export const useAgentMemory = () => useAgentStore((state) => state.memory);
export const useAgentIsTyping = () => useAgentStore((state) => state.isTyping);
export const useAgentIsLearning = () => useAgentStore((state) => state.isLearning);
export const useAgentActions = () => useAgentStore((state) => ({
  addMessage: state.addMessage,
  clearMessages: state.clearMessages,
  updateMemory: state.updateMemory,
  setIsTyping: state.setIsTyping,
  toggleLearning: state.toggleLearning,
}));
```

**Step 2: Commit**

```bash
git add src/stores/agent-store.ts
git commit -m "feat: add agent store with persistent memory

- Implement agent store with full message history
- Add memory structure for user profile, patterns, preferences
- Persist agent state to localStorage
- Include learning toggle functionality"
```

---

## Phase 3: UI Components

### Task 7: Create Mode Switcher Component

**Files:**
- Create: `src/components/ModeSwitcher.tsx`

**Step 1: Create the mode switcher**

```tsx
import { useMode, useModeActions } from '../stores/mode-store';

export function ModeSwitcher() {
  const mode = useMode();
  const { toggleMode } = useModeActions();

  return (
    <button
      onClick={toggleMode}
      className={`
        group flex items-center gap-2.5 px-4 py-2 rounded-xl
        font-medium text-sm transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${mode === 'chat'
          ? 'bg-agent-primary/10 text-agent-primary hover:bg-agent-primary/20 focus:ring-agent-primary dark:focus:ring-offset-agent-surface'
          : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20 focus:ring-chat-primary'
        }
      `}
      aria-label={`Switch to ${mode === 'chat' ? 'Agent' : 'Chat'} Mode`}
    >
      {mode === 'chat' ? (
        <>
          <div className="relative">
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span>Agent Mode</span>
        </>
      ) : (
        <>
          <div className="relative">
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span>Chat Mode</span>
        </>
      )}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ModeSwitcher.tsx
git commit -m "feat: add mode switcher component

- Create toggle button with contextual styling
- Show appropriate icon and label for current mode
- Add keyboard accessibility with aria-label"
```

---

### Task 8: Create Message Component

**Files:**
- Create: `src/components/Message.tsx`

**Step 1: Create the message component**

```tsx
import type { Message as MessageType } from '../types/message';

interface MessageProps {
  message: MessageType;
  mode: 'chat' | 'agent';
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function Message({ message, mode }: MessageProps) {
  const isUser = message.role === 'user';
  const isChat = mode === 'chat';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-2xl
          ${isUser
            ? isChat
              ? 'bg-gradient-to-br from-chat-primary to-chat-secondary text-white rounded-br-md shadow-lg shadow-chat-primary/10'
              : 'bg-gradient-to-br from-agent-primary to-agent-secondary text-white rounded-br-md'
            : isChat
              ? 'bg-white text-chat-text rounded-bl-md shadow-sm border border-chat-border'
              : 'bg-agent-surfaceAlt text-agent-text rounded-bl-md border border-agent-border'
          }
        `}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span
          className={`
            block text-[10px] mt-2 font-mono
            ${isUser
              ? 'text-white/60'
              : isChat
                ? 'text-chat-muted'
                : 'text-agent-muted'
            }
          `}
        >
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/Message.tsx
git commit -m "feat: add message component with styling

- Render user and assistant messages differently
- Apply mode-specific color theming
- Format timestamp in readable format"
```

---

### Task 9: Create Chat Input Component

**Files:**
- Create: `src/components/ChatInput.tsx`

**Step 1: Create the chat input component**

```tsx
import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = 'Type a message...', disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-3 p-3">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="
            w-full resize-none px-4 py-3 rounded-xl
            bg-transparent
            text-chat-text dark:text-agent-text
            placeholder-chat-muted dark:placeholder-agent-muted
            focus:outline-none
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{
            minHeight: '44px',
            maxHeight: '120px',
          }}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={`
          flex-shrink-0 w-11 h-11 rounded-xl
          flex items-center justify-center
          text-white
          transition-all duration-200
          disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none
          ${value.trim() && !disabled
            ? 'bg-chat-primary dark:bg-agent-primary hover:opacity-90 active:scale-95'
            : 'bg-chat-muted/30 dark:bg-agent-muted/30'
          }
        `}
        aria-label="Send message"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ChatInput.tsx
git commit -m "feat: add chat input component

- Auto-expanding textarea with max height
- Enter to send, Shift+Enter for newline
- Send button with disabled state handling
- Keyboard accessibility"
```

---

### Task 10: Create Chat Mode View

**Files:**
- Create: `src/components/ChatMode.tsx`

**Step 1: Create the chat mode component**

```tsx
import { useRef, useEffect } from 'react';
import { useChatMessages, useChatIsTyping, useChatActions } from '../stores/chat-store';
import { Message } from './Message';
import { ChatInput } from './ChatInput';

export function ChatMode() {
  const messages = useChatMessages();
  const isTyping = useChatIsTyping();
  const { addMessage, setIsTyping } = useChatActions();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content });
    setIsTyping(true);

    // Simulate AI response (will be replaced with actual provider)
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    // Add assistant message
    addMessage({ role: 'assistant', content: `I received your message: "${content}". Chat mode is active - no memory is being stored.` });
    setIsTyping(false);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--gradient-chat)' }}
    >
      {/* Header with glass effect */}
      <div className="glass-panel flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-chat-text">Chat Mode</h2>
          <p className="text-sm text-chat-muted">No memory, quick conversations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chat-primary/10">
          <span className="w-2 h-2 rounded-full bg-chat-primary animate-pulse" />
          <span className="text-sm font-medium text-chat-primary">Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-chat-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-chat-primary to-chat-secondary flex items-center justify-center shadow-glow-chat">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-chat-text mb-2">Start a conversation</h3>
            <p className="text-sm text-chat-muted max-w-sm leading-relaxed">
              Chat mode is lightweight and private. Your messages stay here and aren't stored after you close the app.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Message message={message} mode="chat" />
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-4 animate-fade-in">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white shadow-sm border border-chat-border">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input with glass effect */}
      <div className="px-4 pb-4">
        <div className="glass-panel rounded-2xl overflow-hidden">
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ChatMode.tsx
git commit -m "feat: add chat mode view component

- Display messages with auto-scroll
- Show empty state for new conversations
- Add typing indicator animation
- Connect to chat store for state management"
```

---

### Task 11: Create Agent Mode View

**Files:**
- Create: `src/components/MemorySidebar.tsx`
- Create: `src/components/AgentMode.tsx`

**Step 1: Create memory sidebar component**

```tsx
import { useAgentMemory, useAgentIsLearning, useAgentActions } from '../stores/agent-store';

export function MemorySidebar() {
  const memory = useAgentMemory();
  const isLearning = useAgentIsLearning();
  const { toggleLearning } = useAgentActions();

  const patternCount = memory.patterns.length;
  const preferenceCount = Object.keys(memory.preferences).length;

  return (
    <div className="w-72 flex-shrink-0 border-l border-agent-border bg-agent-surface overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-agent-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-agent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-agent-text">Memory</h3>
        </div>

        {/* Learning Toggle */}
        <div className="mb-6">
          <button
            onClick={toggleLearning}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl
              text-sm font-medium transition-all duration-200
              ${isLearning
                ? 'bg-agent-primary/10 text-agent-primary border border-agent-primary/20'
                : 'bg-agent-surfaceAlt text-agent-muted border border-agent-border hover:border-agent-primary/30'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${isLearning ? 'text-agent-primary' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Learning</span>
            </div>
            <div
              className={`w-8 h-5 rounded-full transition-colors duration-200 ${isLearning ? 'bg-agent-primary' : 'bg-zinc-700'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 mt-0.5 ${isLearning ? 'translate-x-3' : 'translate-x-0.5'}`}
              />
            </div>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-agent-surfaceAlt border border-agent-border">
            <p className="text-2xl font-semibold text-agent-text font-mono">{patternCount}</p>
            <p className="text-xs text-agent-muted mt-1">Patterns</p>
          </div>
          <div className="p-3 rounded-xl bg-agent-surfaceAlt border border-agent-border">
            <p className="text-2xl font-semibold text-agent-text font-mono">{preferenceCount}</p>
            <p className="text-xs text-agent-muted mt-1">Preferences</p>
          </div>
        </div>

        {/* User Profile */}
        {memory.userProfile.name && (
          <div className="mb-6">
            <h4 className="text-xs font-medium text-agent-muted uppercase tracking-wider mb-2">
              Profile
            </h4>
            <div className="px-3 py-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border">
              <p className="text-sm text-agent-text">{memory.userProfile.name}</p>
            </div>
          </div>
        )}

        {/* Patterns List */}
        {memory.patterns.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-agent-muted uppercase tracking-wider mb-3">
              Recent Patterns
            </h4>
            <div className="space-y-2">
              {memory.patterns.slice(-5).reverse().map((pattern) => (
                <div
                  key={pattern.id}
                  className="px-3 py-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border group hover:border-agent-primary/30 transition-colors duration-200"
                >
                  <p className="text-xs text-agent-text truncate">{pattern.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-agent-muted font-mono">
                      x{pattern.occurrences}
                    </span>
                    <span className="text-[10px] text-agent-border">•</span>
                    <span className="text-[10px] text-agent-muted">
                      {new Date(pattern.lastSeen).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create agent mode component**

```tsx
import { useRef, useEffect } from 'react';
import { useAgentMessages, useAgentIsTyping, useAgentIsLearning, useAgentActions } from '../stores/agent-store';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { MemorySidebar } from './MemorySidebar';

export function AgentMode() {
  const messages = useAgentMessages();
  const isTyping = useAgentIsTyping();
  const isLearning = useAgentIsLearning();
  const { addMessage, setIsTyping, updateMemory } = useAgentActions();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    addMessage({ role: 'user', content });
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1500));

    const response = isLearning
      ? `I've processed your message and stored it in my memory. I now have ${messages.length + 1} messages to learn from.`
      : `I received your message. Learning is currently paused, so I won't store this interaction.`;

    addMessage({ role: 'assistant', content: response });

    if (isLearning && content.length > 10) {
      const currentPatterns = JSON.parse(localStorage.getItem('claws-agent') || '{}');
      const patterns = currentPatterns?.state?.memory?.patterns || [];

      updateMemory({
        patterns: [
          ...patterns,
          {
            id: `pattern-${Date.now()}`,
            type: 'interaction',
            description: `User discussed: ${content.slice(0, 50)}...`,
            occurrences: 1,
            lastSeen: Date.now(),
          },
        ],
      });
    }

    setIsTyping(false);
  };

  return (
    <div
      className="flex h-full relative"
      style={{
        background: 'var(--gradient-agent)',
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-agent-glow)' }}
      />

      {/* Main Chat Area */}
      <div className="relative flex-1 flex flex-col">
        {/* Header with depth */}
        <div className="depth-panel flex items-center justify-between px-6 py-4 rounded-none border-x-0 border-t-0">
          <div>
            <h2 className="text-lg font-semibold text-agent-text">Agent Mode</h2>
            <p className="text-sm text-agent-muted">Full power with memory and learning</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Learning indicator with glow */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-agent-surfaceAlt">
              <span
                className={`w-2 h-2 rounded-full ${isLearning ? 'bg-agent-primary shadow-glow-agent' : 'bg-zinc-600'}`}
                style={isLearning ? { boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' } : {}}
              />
              <span className={`text-sm font-medium ${isLearning ? 'text-agent-primary' : 'text-zinc-500'}`}>
                {isLearning ? 'Learning' : 'Paused'}
              </span>
            </div>
            <div className="text-sm text-agent-muted font-mono">
              {messages.length} msgs
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-agent-primary/10 rounded-2xl blur-2xl" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-agent-primary to-agent-secondary flex items-center justify-center border border-agent-primary/30">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-agent-text mb-2">Agent Ready</h3>
              <p className="text-sm text-agent-muted max-w-sm leading-relaxed">
                Agent mode has full memory and learning capabilities. I'll remember our conversations and improve over time.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Message message={message} mode="agent" />
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start mb-4 animate-fade-in">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-agent-surfaceAlt border border-agent-border">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-4">
          <div className="depth-panel rounded-2xl overflow-hidden">
            <ChatInput onSend={handleSend} disabled={isTyping} placeholder="Message Agent..." />
          </div>
        </div>
      </div>

      {/* Memory Sidebar */}
      <MemorySidebar />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/MemorySidebar.tsx src/components/AgentMode.tsx
git commit -m "feat: add agent mode with memory sidebar

- Create agent mode view with persistent memory
- Add memory sidebar showing patterns and preferences
- Implement learning toggle functionality
- Display message count and learning status"
```

---

### Task 12: Create Main App Component

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`

**Step 1: Create App component**

```tsx
import { useMode } from './stores/mode-store';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ChatMode } from './components/ChatMode';
import { AgentMode } from './components/AgentMode';

export function App() {
  const mode = useMode();

  return (
    <div
      className={`h-screen flex flex-col mode-transition ${mode === 'agent' ? 'dark' : ''}`}
    >
      {/* Title Bar */}
      <header
        className={`
          drag-region flex items-center justify-between px-5 py-3
          border-b transition-colors duration-300
          ${mode === 'chat'
            ? 'bg-white/90 backdrop-blur-xl border-chat-border'
            : 'bg-agent-surface border-agent-border'
          }
        `}
      >
        <div className="flex items-center gap-4 no-drag">
          {/* Logo */}
          <div className="relative">
            <div
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${mode === 'chat'
                  ? 'bg-gradient-to-br from-chat-primary to-chat-secondary shadow-lg shadow-chat-primary/20'
                  : 'bg-gradient-to-br from-agent-primary to-agent-secondary'
                }
              `}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* App Info */}
          <div>
            <h1
              className={`
                text-base font-semibold transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-text' : 'text-agent-text'}
              `}
            >
              Claws
            </h1>
            <p
              className={`
                text-xs font-mono transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-muted' : 'text-agent-muted'}
              `}
            >
              {mode === 'chat' ? 'chat' : 'agent'} mode
            </p>
          </div>
        </div>

        <div className="no-drag">
          <ModeSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {mode === 'chat' ? <ChatMode /> : <AgentMode />}
      </main>
    </div>
  );
}
```

**Step 2: Create entry point**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 3: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: create main App component with mode switching

- Add title bar with app branding and mode indicator
- Render ChatMode or AgentMode based on current mode
- Apply dark class for agent mode theming
- Use drag regions for native window controls"
```

---

## Phase 4: Polish and Testing

### Task 13: Add Keyboard Shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`

**Step 1: Create keyboard shortcuts hook**

```typescript
import { useEffect } from 'react';

interface Shortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Build the key combination string
      const parts: string[] = [];
      if (event.metaKey || event.ctrlKey) parts.push('cmd');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');
      parts.push(event.key.toLowerCase());

      const combo = parts.join('+');
      const handler = shortcuts[combo];

      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

**Step 2: Update App.tsx to use shortcuts**

```tsx
import { useCallback } from 'react';
import { useMode, useModeActions } from './stores/mode-store';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ChatMode } from './components/ChatMode';
import { AgentMode } from './components/AgentMode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
  const mode = useMode();
  const { toggleMode } = useModeActions();

  const handleToggleMode = useCallback(() => {
    toggleMode();
  }, [toggleMode]);

  useKeyboardShortcuts({
    'cmd+m': handleToggleMode, // Mac
    'ctrl+m': handleToggleMode, // Windows/Linux
  });

  return (
    <div
      className={`h-screen flex flex-col mode-transition ${mode === 'agent' ? 'dark' : ''}`}
    >
      {/* Title Bar */}
      <header
        className={`
          drag-region flex items-center justify-between px-5 py-3
          border-b transition-colors duration-300
          ${mode === 'chat'
            ? 'bg-white/90 backdrop-blur-xl border-chat-border'
            : 'bg-agent-surface border-agent-border'
          }
        `}
      >
        <div className="flex items-center gap-4 no-drag">
          {/* Logo */}
          <div className="relative">
            <div
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${mode === 'chat'
                  ? 'bg-gradient-to-br from-chat-primary to-chat-secondary shadow-lg shadow-chat-primary/20'
                  : 'bg-gradient-to-br from-agent-primary to-agent-secondary'
                }
              `}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* App Info */}
          <div>
            <h1
              className={`
                text-base font-semibold transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-text' : 'text-agent-text'}
              `}
            >
              Claws
            </h1>
            <p
              className={`
                text-xs font-mono transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-muted' : 'text-agent-muted'}
              `}
            >
              {mode === 'chat' ? 'chat' : 'agent'} mode • <span className="opacity-60">⌘M</span>
            </p>
          </div>
        </div>

        <div className="no-drag">
          <ModeSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {mode === 'chat' ? <ChatMode /> : <AgentMode />}
      </main>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx
git commit -m "feat: add Cmd/Ctrl+M keyboard shortcut for mode switching

- Create reusable keyboard shortcuts hook
- Ignore shortcuts when focused on input fields
- Show shortcut hint in title bar"
```

---

### Task 14: Add Export Component Index

**Files:**
- Create: `src/components/index.ts`
- Create: `src/stores/index.ts`
- Create: `src/hooks/index.ts`

**Step 1: Create component exports**

```typescript
export { App } from './App';
export { ChatMode } from './ChatMode';
export { AgentMode } from './AgentMode';
export { ModeSwitcher } from './ModeSwitcher';
export { Message } from './Message';
export { ChatInput } from './ChatInput';
export { MemorySidebar } from './MemorySidebar';
```

**Step 2: Create store exports**

```typescript
export { useModeStore, useMode, useModeActions } from './mode-store';
export { useChatStore, useChatMessages, useChatIsTyping, useChatActions } from './chat-store';
export { useAgentStore, useAgentMessages, useAgentMemory, useAgentIsTyping, useAgentIsLearning, useAgentActions } from './agent-store';
```

**Step 3: Create hook exports**

```typescript
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
```

**Step 4: Commit**

```bash
git add src/components/index.ts src/stores/index.ts src/hooks/index.ts
git commit -m "refactor: add barrel exports for clean imports

- Export all components from single entry point
- Export all stores and hooks for convenience
- Enable cleaner import statements"
```

---

### Task 15: Final Testing and Build

**Step 1: Test development server**

Run: `npm run dev`
Expected: Vite server starts at http://localhost:5173

**Step 2: Test Electron in development**

Run: `npm run electron:dev`
Expected:
- Electron window opens
- React app loads
- Mode switching works
- Chat messages display correctly
- Agent mode shows sidebar
- Persistence works across reload

**Step 3: Build for production**

Run: `npm run build`
Expected:
- TypeScript compiles without errors
- Vite builds renderer to dist/
- Electron main compiles to dist-electron/

**Step 4: Create electron-builder config**

Create: `electron-builder.yml`

```yaml
appId: com.claws.desktop
productName: Claws
directories:
  buildResources: resources
  output: release
files:
  - dist/**/*
  - dist-electron/**/*
mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip
  darkModeSupport: true
win:
  target:
    - nsis
    - portable
```

**Step 5: Final commit**

```bash
git add electron-builder.yml
git commit -m "chore: add electron-builder configuration

- Configure build for macOS (dmg, zip)
- Configure build for Windows (nsis, portable)
- Set app category and product name"
```

---

## Summary

This plan creates a fully functional MVP with:

1. **Two-mode system** - Chat (lightweight, no memory) and Agent (full memory, learning)
2. **Instant mode switching** - Keyboard shortcut + button, persists preference
3. **Clean architecture** - Zustand stores, React components, TypeScript throughout
4. **Professional UI** - TailwindCSS with mode-specific theming, no generic AI slop
5. **Local persistence** - Chat messages limited to 10, Agent has full memory in localStorage

**What's NOT included (Phase 2+):**
- Real AI provider integration
- SQLite database
- Skills system
- Self-learning patterns
- Onboarding wizard
- Settings UI
