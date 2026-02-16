# Agent Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize Agent management (Config, Skills, Automation) with hybrid approach - basic in Settings modal, Automation in separate panel.

**Architecture:** Settings modal gets Agent Config + Skills tabs. Automation Dashboard is a separate panel with visual cron builder (no raw syntax exposed).

**Tech Stack:** React, TypeScript, Tailwind CSS, node-cron, SQLite

---

## User Decisions

| Decision | Choice |
|----------|--------|
| **Location** | Hybrid: Config/Skills in Settings, Automation separate |
| **Cron UX** | Visual Builder Only (presets, no raw syntax) |
| **Skills UI** | Embedded tab within Settings |

---

## Task 1: Add Automation Tables to Database

**Files:**
- Modify: `electron/database.ts`

**Step 1: Add automation_tasks table**

```typescript
// In createTables() function, add:
this.db.exec(`
  CREATE TABLE IF NOT EXISTS automation_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('cron', 'hook')),
    trigger TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('prompt', 'script')),
    action_data TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_run TEXT
  )
`);
```

**Step 2: Add automation_logs table**

```typescript
this.db.exec(`
  CREATE TABLE IF NOT EXISTS automation_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    output TEXT,
    FOREIGN KEY (task_id) REFERENCES automation_tasks(id)
  )
`);
```

**Step 3: Commit**

```bash
git add electron/database.ts
git commit -m "feat(db): add automation_tasks and automation_logs tables"
```

---

## Task 2: Create Automation Store

**Files:**
- Create: `src/stores/automation-store.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand';

export interface AutomationTask {
  id: string;
  name: string;
  type: 'cron' | 'hook';
  trigger: string;
  action_type: 'prompt' | 'script';
  action_data: string;
  is_active: boolean;
  created_at: string;
  last_run?: string;
}

interface AutomationState {
  tasks: AutomationTask[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  createTask: (task: Omit<AutomationTask, 'id' | 'created_at'>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    const tasks = await window.electron.invoke('automation:list');
    set({ tasks, isLoading: false });
  },

  createTask: async (task) => {
    await window.electron.invoke('automation:create', task);
    await get().fetchTasks();
  },

  toggleTask: async (id) => {
    await window.electron.invoke('automation:toggle', id);
    await get().fetchTasks();
  },

  deleteTask: async (id) => {
    await window.electron.invoke('automation:delete', id);
    await get().fetchTasks();
  },
}));
```

**Step 2: Commit**

```bash
git add src/stores/automation-store.ts
git commit -m "feat(store): add automation store for tasks management"
```

---

## Task 3: Create Automation Backend (Electron)

**Files:**
- Create: `electron/automation.ts`
- Modify: `electron/main.ts`

**Step 1: Create automation.ts**

```typescript
import cron from 'node-cron';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

const scheduler = new EventEmitter();
const scheduledJobs = new Map<string, cron.ScheduledTask>();

export function initAutomation(db: Database.Database) {
  // Load existing tasks on startup
  const tasks = db.prepare('SELECT * FROM automation_tasks WHERE is_active = 1').all() as any[];
  tasks.forEach(task => {
    if (task.type === 'cron') {
      scheduleCronJob(task);
    }
  });

  // Register built-in hooks
  scheduler.on('app:startup', () => {
    triggerHooks('app:startup', db);
  });
}

export function createTask(db: Database.Database, task: any) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO automation_tasks (id, name, type, trigger, action_type, action_data, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, task.name, task.type, task.trigger, task.action_type, task.action_data, task.is_active ? 1 : 0);

  if (task.is_active && task.type === 'cron') {
    scheduleCronJob({ id, ...task });
  }
  return id;
}

export function listTasks(db: Database.Database) {
  return db.prepare('SELECT * FROM automation_tasks ORDER BY created_at DESC').all();
}

export function toggleTask(db: Database.Database, id: string) {
  const task = db.prepare('SELECT * FROM automation_tasks WHERE id = ?').get(id) as any;
  const newActive = task.is_active ? 0 : 1;
  db.prepare('UPDATE automation_tasks SET is_active = ? WHERE id = ?').run(newActive, id);

  if (newActive && task.type === 'cron') {
    scheduleCronJob(task);
  } else {
    const job = scheduledJobs.get(id);
    if (job) job.stop();
    scheduledJobs.delete(id);
  }
}

export function deleteTask(db: Database.Database, id: string) {
  const job = scheduledJobs.get(id);
  if (job) job.stop();
  scheduledJobs.delete(id);
  db.prepare('DELETE FROM automation_tasks WHERE id = ?').run(id);
}

export function triggerEvent(eventName: string) {
  scheduler.emit(eventName);
}

function scheduleCronJob(task: any) {
  if (scheduledJobs.has(task.id)) {
    scheduledJobs.get(task.id)!.stop();
  }
  const job = cron.schedule(task.trigger, () => {
    console.log(`Running task: ${task.name}`);
    // TODO: Execute action based on action_type
  });
  scheduledJobs.set(task.id, job);
}

function triggerHooks(eventName: string, db: Database.Database) {
  const hooks = db.prepare('SELECT * FROM automation_tasks WHERE type = ? AND trigger = ? AND is_active = 1')
    .all('hook', eventName) as any[];
  hooks.forEach(hook => {
    console.log(`Triggering hook: ${hook.name}`);
    // TODO: Execute action
  });
}
```

**Step 2: Add IPC handlers to main.ts**

```typescript
// At top:
import { initAutomation, createTask, listTasks, toggleTask, deleteTask, triggerEvent } from './automation';

// After db init:
initAutomation(db);

// Add IPC handlers:
ipcMain.handle('automation:list', () => listTasks(db));
ipcMain.handle('automation:create', (_, task) => createTask(db, task));
ipcMain.handle('automation:toggle', (_, id) => toggleTask(db, id));
ipcMain.handle('automation:delete', (_, id) => deleteTask(db, id));

// Trigger startup event after window ready:
setTimeout(() => triggerEvent('app:startup'), 1000);
```

**Step 3: Install dependencies**

```bash
npm install node-cron uuid
npm install @types/node-cron @types/uuid --save-dev
```

**Step 4: Commit**

```bash
git add electron/automation.ts electron/main.ts package.json
git commit -m "feat(electron): add automation backend with cron scheduler and hooks"
```

---

## Task 4: Add Agent Tabs to SettingsPage

**Files:**
- Modify: `src/components/SettingsPage.tsx`

**Step 1: Add Agent tab to tabs array**

Find the `tabs` array and add:

```typescript
// Add after existing tabs:
{ id: 'agent-config', label: 'Agent', icon: '🤖' },
{ id: 'agent-skills', label: 'Skills', icon: '⚡' },
```

**Step 2: Add Agent Config panel content**

```typescript
// In the tab content switch, add:
case 'agent-config':
  return (
    <div className="space-y-6">
      <div>
        <label className={`block text-sm font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className={`w-full mt-1.5 px-3 py-2 rounded-lg text-sm border outline-none transition-all min-h-[200px] font-mono
            ${isAgent
              ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/40 focus:border-agent-primary'
              : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/40 focus:border-chat-primary'
            }`}
          placeholder="You are a helpful assistant..."
        />
        <p className={`mt-1 text-xs ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
          {systemPrompt.length} characters
        </p>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
          Personality Preset
        </label>
        <div className="flex gap-2">
          {['Professional', 'Creative', 'Casual'].map((preset) => (
            <button
              key={preset}
              onClick={() => setPersonality(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${personality === preset
                  ? isAgent
                    ? 'bg-agent-primary text-white'
                    : 'bg-chat-primary text-white'
                  : isAgent
                    ? 'bg-agent-surfaceAlt text-agent-muted hover:text-agent-text'
                    : 'bg-gray-100 text-chat-muted hover:text-chat-text'
                }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-dashed">
        <button
          onClick={() => window.electron.send('open-automation-dashboard')}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between
            ${isAgent
              ? 'bg-agent-surfaceAlt text-agent-text hover:bg-agent-surface border border-agent-border'
              : 'bg-gray-50 text-chat-text hover:bg-gray-100 border border-chat-border'
            }`}
        >
          <span>⚙️ Open Automation Dashboard</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
```

**Step 3: Add Skills tab panel (placeholder)**

```typescript
case 'agent-skills':
  return (
    <div className="text-center py-12">
      <p className={isAgent ? 'text-agent-muted' : 'text-chat-muted'}>
        Skills management will be embedded here
      </p>
    </div>
  );
```

**Step 4: Commit**

```bash
git add src/components/SettingsPage.tsx
git commit -m "feat(ui): add Agent Config and Skills tabs to Settings"
```

---

## Task 5: Create AutomationDashboard Component

**Files:**
- Create: `src/components/AutomationDashboard.tsx`

**Step 1: Create the component**

```typescript
import React, { useEffect, useState } from 'react';
import { useAutomationStore, AutomationTask } from '../stores/automation-store';
import { useAgentStore } from '../stores/agent-store';

export const AutomationDashboard: React.FC = () => {
  const { tasks, isLoading, fetchTasks, toggleTask, deleteTask } = useAutomationStore();
  const { isAgent } = useAgentStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const cronTasks = tasks.filter(t => t.type === 'cron');
  const hooks = tasks.filter(t => t.type === 'hook');

  return (
    <div className={`min-h-screen p-6 ${isAgent ? 'bg-agent-bg text-agent-text' : 'bg-chat-bg text-chat-text'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Automation Dashboard</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all
              ${isAgent ? 'bg-agent-primary text-white hover:bg-agent-primary/90' : 'bg-chat-primary text-white hover:bg-chat-primary/90'}`}
          >
            + Add Task
          </button>
        </div>

        {/* Scheduled Tasks */}
        <section className="mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
            Scheduled Tasks ({cronTasks.length})
          </h2>
          {cronTasks.length === 0 ? (
            <EmptyState isAgent={isAgent} message="No scheduled tasks yet" />
          ) : (
            <div className="space-y-3">
              {cronTasks.map(task => (
                <TaskCard key={task.id} task={task} isAgent={isAgent} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </section>

        {/* Event Hooks */}
        <section>
          <h2 className={`text-lg font-semibold mb-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
            Event Hooks ({hooks.length})
          </h2>
          {hooks.length === 0 ? (
            <EmptyState isAgent={isAgent} message="No event hooks configured" />
          ) : (
            <div className="space-y-3">
              {hooks.map(task => (
                <TaskCard key={task.id} task={task} isAgent={isAgent} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddModal && <AddTaskModal isAgent={isAgent} onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

const TaskCard: React.FC<{
  task: AutomationTask;
  isAgent: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, isAgent, onToggle, onDelete }) => (
  <div className={`rounded-xl border p-4 ${isAgent ? 'bg-agent-surface border-agent-border' : 'bg-white border-chat-border'}`}>
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium">{task.name}</h3>
        <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
          {task.type === 'cron' ? `📅 ${formatSchedule(task.trigger)}` : `⚡ ${task.trigger}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(task.id)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors
            ${task.is_active
              ? 'bg-green-500/20 text-green-500'
              : isAgent ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}
        >
          {task.is_active ? 'Active' : 'Paused'}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className={`px-2 py-1 rounded text-xs ${isAgent ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const EmptyState: React.FC<{ isAgent: boolean; message: string }> = ({ isAgent, message }) => (
  <div className={`rounded-xl border p-8 text-center ${isAgent ? 'bg-agent-surface border-agent-border' : 'bg-white border-chat-border'}`}>
    <p className={isAgent ? 'text-agent-muted' : 'text-chat-muted'}>{message}</p>
  </div>
);

function formatSchedule(cron: string): string {
  // Simple cron to natural language
  const parts = cron.split(' ');
  if (parts[0] !== '*') return `Every minute`;
  if (parts[1] !== '*') return `Every hour at minute ${parts[0]}`;
  if (parts[2] !== '*') return `Every day at ${parts[1]}:00`;
  return cron;
}
```

**Step 2: Commit**

```bash
git add src/components/AutomationDashboard.tsx
git commit -m "feat(ui): add AutomationDashboard component with task list"
```

---

## Task 6: Create AddTaskModal with Visual Cron Builder

**Files:**
- Modify: `src/components/AutomationDashboard.tsx` (add modal)

**Step 1: Add AddTaskModal component**

```typescript
const AddTaskModal: React.FC<{ isAgent: boolean; onClose: () => void }> = ({ isAgent, onClose }) => {
  const { createTask } = useAutomationStore();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'minute' | 'hour' | 'day' | 'month'>('day');
  const [time, setTime] = useState('08:00');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');
  const [actionType, setActionType] = useState<'prompt' | 'script'>('prompt');
  const [actionData, setActionData] = useState('');

  const getCronExpression = () => {
    const [hour, minute] = time.split(':').map(Number);
    const hour24 = ampm === 'PM' && hour !== 12 ? hour + 12 : hour === 12 && ampm === 'AM' ? 0 : hour;

    switch (frequency) {
      case 'minute': return '* * * * *';
      case 'hour': return `${minute} * * * *`;
      case 'day': return `${minute} ${hour24} * * *`;
      case 'month': return `${minute} ${hour24} 1 * *`;
      default: return `${minute} ${hour24} * * *`;
    }
  };

  const getPreviewText = () => {
    const [hour] = time.split(':');
    switch (frequency) {
      case 'minute': return 'Every minute';
      case 'hour': return 'Every hour';
      case 'day': return `Every day at ${time} ${ampm}`;
      case 'month': return `Every month on the 1st at ${time} ${ampm}`;
      default: return '';
    }
  };

  const handleCreate = async () => {
    await createTask({
      name,
      type: 'cron',
      trigger: getCronExpression(),
      action_type: actionType,
      action_data: actionData,
      is_active: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-xl p-6 ${isAgent ? 'bg-agent-surface border border-agent-border' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Create New Task</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Task Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm
              ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border'}`}
            placeholder="Morning Briefing"
          />
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">How often?</label>
          <div className="grid grid-cols-4 gap-2">
            {(['minute', 'hour', 'day', 'month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${frequency === f
                    ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                    : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                  }`}
              >
                Every {f}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        {frequency !== 'minute' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">At what time?</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm
                  ${isAgent ? 'bg-agent-bg border-agent-border' : 'bg-white border-chat-border'}`}
              />
              <select
                value={ampm}
                onChange={e => setAmPm(e.target.value as 'AM' | 'PM')}
                className={`px-3 py-2 rounded-lg border text-sm
                  ${isAgent ? 'bg-agent-bg border-agent-border' : 'bg-white border-chat-border'}`}
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>
        )}

        {/* Action Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Action Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActionType('prompt')}
              className={`py-2 rounded-lg text-sm font-medium transition-all
                ${actionType === 'prompt'
                  ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                  : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                }`}
            >
              Send Prompt
            </button>
            <button
              onClick={() => setActionType('script')}
              className={`py-2 rounded-lg text-sm font-medium transition-all
                ${actionType === 'script'
                  ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                  : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                }`}
            >
              Run Script
            </button>
          </div>
        </div>

        {/* Action Data */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {actionType === 'prompt' ? 'Prompt' : 'Script Path'}
          </label>
          {actionType === 'prompt' ? (
            <textarea
              value={actionData}
              onChange={e => setActionData(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm min-h-[80px]
                ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border'}`}
              placeholder="Good morning! Generate my daily briefing..."
            />
          ) : (
            <input
              value={actionData}
              onChange={e => setActionData(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm
                ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border'}`}
              placeholder="/path/to/script.py"
            />
          )}
        </div>

        {/* Preview */}
        <p className={`text-sm mb-4 ${isAgent ? 'text-agent-primary' : 'text-chat-primary'}`}>
          Preview: "{getPreviewText()}"
        </p>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium
              ${isAgent ? 'bg-agent-surfaceAlt text-agent-muted hover:text-agent-text' : 'bg-gray-100 text-chat-muted hover:text-chat-text'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !actionData}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40
              ${isAgent ? 'bg-agent-primary hover:bg-agent-primary/90' : 'bg-chat-primary hover:bg-chat-primary/90'}`}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/AutomationDashboard.tsx
git commit -m "feat(ui): add Visual Cron Builder modal (no raw cron syntax)"
```

---

## Task 7: Wire AutomationDashboard to App

**Files:**
- Modify: `src/App.tsx` or main component

**Step 1: Add route/state for AutomationDashboard**

```typescript
import { AutomationDashboard } from './components/AutomationDashboard';

// Add state:
const [showAutomation, setShowAutomation] = useState(false);

// Add IPC listener in useEffect:
useEffect(() => {
  window.electron.on('open-automation-dashboard', () => setShowAutomation(true));
  return () => window.electron.removeAllListeners('open-automation-dashboard');
}, []);

// Render conditionally:
{showAutomation && <AutomationDashboard onClose={() => setShowAutomation(false)} />}
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): wire AutomationDashboard to app with IPC trigger"
```

---

## Verification

1. Open Settings → Agent tab → Update system prompt → Verify saved
2. Open Automation Dashboard → Add task "Every day at 8AM" → Verify natural language preview
3. Toggle task active/paused → Verify state changes
4. Restart app → Verify tasks persist

---

## Files Summary

| File | Action |
|------|--------|
| `electron/database.ts` | Modify - add tables |
| `electron/automation.ts` | Create - scheduler/hooks |
| `electron/main.ts` | Modify - IPC handlers |
| `src/stores/automation-store.ts` | Create - state |
| `src/components/SettingsPage.tsx` | Modify - Agent tabs |
| `src/components/AutomationDashboard.tsx` | Create - UI |
| `src/App.tsx` | Modify - wire dashboard |
