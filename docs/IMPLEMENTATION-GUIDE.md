# Claude Code Implementation Guide

**Purpose:** Step-by-step instructions for Claude Code to build Claws desktop app
**Prerequisites:** Node.js 18+, npm, git

---

## 🚀 Quick Start (Copy-Paste This)

```bash
# Create project
mkdir claws-desktop
cd claws-desktop
npm init -y

# Install dependencies
npm install electron react react-dom typescript
npm install -D @types/react @types/react-dom
npm install -D electron-builder concurrently wait-on

# Initialize
npx tsc --init
```

---

## 📋 Step 1: Project Setup

### 1.1 Create Directory Structure

```bash
mkdir -p electron/ipc
mkdir -p src/components/ChatMode
mkdir -p src/components/AgentMode
mkdir -p src/components/common
mkdir -p src/stores
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p resources/icons
```

### 1.2 Create package.json

```json
{
  "name": "claws-desktop",
  "version": "1.0.0",
  "description": "Personal AI assistant with two modes",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:electron\"",
    "dev:renderer": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "npm run build:renderer && npm run build:electron",
    "build:renderer": "vite build",
    "build:electron": "tsc -p tsconfig.electron.json",
    "dist": "electron-builder",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "better-sqlite3": "^9.2.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0"
  }
}
```

---

## 📋 Step 2: Electron Main Process

### 2.1 Create electron/main.ts

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1E1E1E'
  });

  // Development: load from vite
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});
```

### 2.2 Create electron/preload.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Add more IPC methods here as needed
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  
  receive: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
});
```

---

## 📋 Step 3: React App Structure

### 3.1 Create src/App.tsx

```tsx
import React from 'react';
import { useMode } from './stores/useMode';
import { ChatMode } from './components/ChatMode/ChatMode';
import { AgentMode } from './components/AgentMode/AgentMode';
import { ModeSwitcher } from './components/common/ModeSwitcher';

export const App: React.FC = () => {
  const { mode } = useMode();
  
  return (
    <div className={`app ${mode}`}>
      <header>
        <h1>🤖 Claws - {mode === 'chat' ? 'Chat' : 'Agent'} Mode</h1>
        <ModeSwitcher />
      </header>
      
      <main>
        {mode === 'chat' ? <ChatMode /> : <AgentMode />}
      </main>
    </div>
  );
};
```

### 3.2 Create src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 📋 Step 4: State Management (Zustand)

### 4.1 Create src/stores/useMode.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModeState {
  mode: 'chat' | 'agent';
  setMode: (mode: 'chat' | 'agent') => void;
  toggleMode: () => void;
}

export const useMode = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: 'chat', // Default
      
      setMode: (mode) => set({ mode }),
      
      toggleMode: () => {
        const current = get().mode;
        set({ mode: current === 'chat' ? 'agent' : 'chat' });
      }
    }),
    {
      name: 'claws-mode'
    }
  )
);
```

### 4.2 Create src/stores/useChat.ts

```typescript
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
}

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    set(state => ({
      messages: [...state.messages, newMessage].slice(-10) // Keep last 10
    }));
  },
  
  clearMessages: () => set({ messages: [] })
}));
```

### 4.3 Create src/stores/useAgent.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentState {
  messages: any[];
  memory: {
    userProfile: Record<string, any>;
    patterns: any[];
    preferences: Record<string, any>;
  };
  addMessage: (message: any) => void;
  updateMemory: (key: string, value: any) => void;
  learnPattern: (pattern: any) => void;
}

export const useAgent = create<AgentState>()(
  persist(
    (set, get) => ({
      messages: [],
      memory: {
        userProfile: {},
        patterns: [],
        preferences: {}
      },
      
      addMessage: (message) => {
        set(state => ({
          messages: [...state.messages, {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date()
          }]
        }));
      },
      
      updateMemory: (key, value) => {
        set(state => ({
          memory: {
            ...state.memory,
            [key]: value
          }
        }));
      },
      
      learnPattern: (pattern) => {
        set(state => ({
          memory: {
            ...state.memory,
            patterns: [...state.memory.patterns, pattern]
          }
        }));
      }
    }),
    {
      name: 'claws-agent-memory'
    }
  )
);
```

---

## 📋 Step 5: UI Components

### 5.1 Create src/components/common/ModeSwitcher.tsx

```tsx
import React from 'react';
import { useMode } from '../../stores/useMode';

export const ModeSwitcher: React.FC = () => {
  const { mode, toggleMode } = useMode();
  
  return (
    <button 
      onClick={toggleMode}
      className="mode-switcher"
      title={`Switch to ${mode === 'chat' ? 'Agent' : 'Chat'} Mode`}
    >
      {mode === 'chat' ? '🤖 Agent' : '💬 Chat'}
    </button>
  );
};
```

### 5.2 Create src/components/ChatMode/ChatMode.tsx

```tsx
import React, { useState } from 'react';
import { useChat } from '../../stores/useChat';

export const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const { messages, addMessage, clearMessages } = useChat();
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    addMessage({ role: 'user', content: input });
    setInput('');
    
    // TODO: Send to AI provider
    // For now, echo back
    setTimeout(() => {
      addMessage({ role: 'assistant', content: `Echo: ${input}` });
    }, 500);
  };
  
  return (
    <div className="chat-mode">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
        <button onClick={clearMessages}>Clear</button>
      </div>
    </div>
  );
};
```

### 5.3 Create src/components/AgentMode/AgentMode.tsx

```tsx
import React, { useState } from 'react';
import { useAgent } from '../../stores/useAgent';

export const AgentMode: React.FC = () => {
  const [input, setInput] = useState('');
  const { messages, addMessage, memory } = useAgent();
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    addMessage({ role: 'user', content: input });
    setInput('');
    
    // TODO: Send to AI with full memory
    // For now, show memory is active
    setTimeout(() => {
      addMessage({ 
        role: 'assistant', 
        content: `Agent response. Memory: ${Object.keys(memory.preferences).length} preferences known.` 
      });
    }, 500);
  };
  
  return (
    <div className="agent-mode">
      <div className="status-bar">
        Status: Ready | Memory: Active | Learning: ON
      </div>
      
      <div className="main-content">
        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </div>
        
        <div className="sidebar">
          <h3>Memory</h3>
          <p>Preferences: {Object.keys(memory.preferences).length}</p>
          <p>Patterns: {memory.patterns.length}</p>
        </div>
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
```

---

## 📋 Step 6: Styling

### 6.1 Create src/styles.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app.chat {
  background: #F5F5F5;
  color: #333;
}

.app.agent {
  background: #1E1E1E;
  color: #E0E0E0;
}

header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.mode-switcher {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.chat .mode-switcher {
  background: #4A90E2;
  color: white;
}

.agent .mode-switcher {
  background: #2ECC71;
  color: white;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.message {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.message.user {
  background: rgba(74, 144, 226, 0.2);
  margin-left: 20%;
}

.message.assistant {
  background: rgba(46, 204, 113, 0.2);
  margin-right: 20%;
}

.input-area {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.1);
  color: inherit;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

/* Agent mode specific */
.agent-mode .status-bar {
  padding: 0.5rem 1rem;
  background: rgba(46, 204, 113, 0.1);
  font-size: 0.875rem;
}

.agent-mode .main-content {
  display: flex;
  flex: 1;
}

.agent-mode .sidebar {
  width: 250px;
  padding: 1rem;
  border-left: 1px solid rgba(255,255,255,0.1);
}
```

---

## 📋 Step 7: Build Configuration

### 7.1 Create vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  }
});
```

### 7.2 Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM"],
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
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.electron.json" }]
}
```

### 7.3 Create electron-builder.yml

```yaml
appId: com.claws.desktop
productName: Claws
directories:
  buildResources: resources
mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip
win:
  target:
    - nsis
    - portable
```

---

## 🚀 Running the App

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run dist
```

### Build for Mac
```bash
npm run dist:mac
```

### Build for Windows
```bash
npm run dist:win
```

---

## ✅ Next Steps After Basic App

1. **Integrate OpenClaw** - Embed OpenClaw core
2. **Add AI Provider** - Connect to OpenAI/Anthropic
3. **Implement Memory** - SQLite database
4. **Add Skills** - File management, web search
5. **Build Learning** - Reflection, patterns
6. **Polish UI** - Better design, animations

---

## 🎯 MVP Checklist

**Must Have:**
- [ ] Electron app runs
- [ ] Two modes switchable
- [ ] Chat mode works (basic)
- [ ] Agent mode works (basic)
- [ ] Settings saved
- [ ] Builds for Mac
- [ ] Builds for Windows

**Nice to Have:**
- [ ] AI provider connected
- [ ] Memory system working
- [ ] Skills loading
- [ ] Learning active

---

## 📝 Notes for Claude Code

1. **Start simple** - Get basic app working first
2. **Test often** - Run `npm run dev` frequently
3. **Iterate** - Don't try to build everything at once
4. **Ask questions** - If something isn't clear, ask
5. **Focus on MVP** - Get core features working first

---

*This guide is ready to use*
*Give to Claude Code and say: "Build this app following this guide"*
