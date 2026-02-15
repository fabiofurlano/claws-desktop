# Vercel Skills Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to browse, install, and use skills from Vercel Skills (skills.sh) directly in Claws Desktop with zero code required.

**Architecture:** Create a skills registry service in Electron main process that runs `npx skills` CLI commands, parses SKILL.md files, and exposes them via IPC to the renderer. The UI provides a browser to discover skills and a list to manage installed ones.

**Tech Stack:** Electron IPC, child_process for CLI execution, gray-matter for YAML parsing, Zustand for state, React for UI.

---

## Task 1: Create Skills Registry Service

**Files:**
- Create: `electron/skills-registry.ts`
- Create: `src/types/skill.ts`

**Step 1: Create the skill types file**

Create `src/types/skill.ts`:

```typescript
// Unified Skill interface for Claws Desktop

export type SkillSource = 'builtin' | 'vercel' | 'local';

export interface Skill {
    id: string;
    name: string;
    description: string;
    source: SkillSource;
    isEnabled: boolean;
    // System prompt for AI injection
    systemPrompt?: string;
    // Optional fields from Vercel/Agent Skills spec
    license?: string;
    allowedTools?: string[];
    triggers?: string[];
    // Metadata
    icon?: string;
    version?: string;
    installedAt?: number;
}

export interface SkillMetadata {
    id: string;
    name: string;
    description: string;
    owner: string;
    version?: string;
}

export interface SkillInstallResult {
    success: boolean;
    skill?: Skill;
    error?: string;
}
```

**Step 2: Verify file was created**

Run: `ls -la src/types/skill.ts`
Expected: File exists with content above

**Step 3: Install gray-matter for YAML parsing**

Run: `npm install gray-matter`
Expected: Package added to package.json

**Step 4: Create the skills registry service**

Create `electron/skills-registry.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import matter from 'gray-matter';
import type { Skill, SkillMetadata, SkillInstallResult } from '../src/types/skill';

const execAsync = promisify(exec);

// Directory where Vercel skills are installed
function getSkillsDir(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'skills');
}

// Ensure skills directory exists
function ensureSkillsDir(): void {
    const skillsDir = getSkillsDir();
    if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
    }
}

// Parse a SKILL.md file and return a Skill object
function parseSkillMarkdown(skillPath: string, skillId: string): Skill | null {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const { data, content: body } = matter(content);

        // Combine frontmatter description with body as system prompt
        const systemPrompt = body.trim();

        return {
            id: skillId,
            name: data.name || skillId,
            description: data.description || 'No description available',
            source: 'vercel' as const,
            isEnabled: true,
            systemPrompt: systemPrompt || undefined,
            license: data.license,
            allowedTools: data['allowed-tools'],
            installedAt: Date.now(),
        };
    } catch (error) {
        console.error(`Failed to parse skill ${skillId}:`, error);
        return null;
    }
}

// List all installed skills from the skills directory
export async function listInstalledSkills(): Promise<Skill[]> {
    ensureSkillsDir();
    const skillsDir = getSkillsDir();
    const skills: Skill[] = [];

    try {
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillId = entry.name;
                const skill = parseSkillMarkdown(path.join(skillsDir, skillId), skillId);
                if (skill) {
                    skills.push(skill);
                }
            }
        }
    } catch (error) {
        console.error('Failed to list installed skills:', error);
    }

    return skills;
}

// Install a skill from Vercel Skills registry
export async function installSkill(skillId: string): Promise<SkillInstallResult> {
    ensureSkillsDir();
    const skillsDir = getSkillsDir();

    try {
        // Run npx skills add command
        const { stdout, stderr } = await execAsync(
            `npx skills add ${skillId} --dir "${skillsDir}"`,
            { timeout: 120000 } // 2 minute timeout
        );

        console.log('Skills install stdout:', stdout);
        if (stderr) {
            console.log('Skills install stderr:', stderr);
        }

        // Parse the installed skill
        // skillId format is usually "owner/skill-name"
        const skillName = skillId.split('/').pop() || skillId;
        const skill = parseSkillMarkdown(path.join(skillsDir, skillName), skillId);

        if (skill) {
            return { success: true, skill };
        } else {
            return { success: false, error: 'Failed to parse installed skill' };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to install skill:', errorMessage);
        return { success: false, error: errorMessage };
    }
}

// Uninstall a skill
export async function uninstallSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
    ensureSkillsDir();
    const skillsDir = getSkillsDir();

    // skillId format is "owner/skill-name", directory is "skill-name"
    const skillName = skillId.split('/').pop() || skillId;
    const skillPath = path.join(skillsDir, skillName);

    try {
        if (fs.existsSync(skillPath)) {
            fs.rmSync(skillPath, { recursive: true, force: true });
            return { success: true };
        } else {
            return { success: false, error: 'Skill not found' };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

// Search for skills (placeholder - would need API or web scraping)
export async function searchSkills(query?: string): Promise<SkillMetadata[]> {
    // For now, return some popular skills as suggestions
    // In future, this could query skills.sh API or scrape the website
    const popularSkills: SkillMetadata[] = [
        { id: 'vercel/nextjs', name: 'Next.js', description: 'Next.js framework best practices and patterns', owner: 'vercel' },
        { id: 'vercel/react', name: 'React', description: 'React development patterns and utilities', owner: 'vercel' },
        { id: 'vercel/typescript', name: 'TypeScript', description: 'TypeScript type definitions and patterns', owner: 'vercel' },
        { id: 'vercel/tailwind', name: 'Tailwind CSS', description: 'Tailwind CSS styling patterns', owner: 'vercel' },
    ];

    if (!query) {
        return popularSkills;
    }

    const lowerQuery = query.toLowerCase();
    return popularSkills.filter(skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
    );
}
```

**Step 5: Verify registry service was created**

Run: `ls -la electron/skills-registry.ts`
Expected: File exists

**Step 6: Commit**

```bash
git add src/types/skill.ts electron/skills-registry.ts package.json package-lock.json
git commit -m "feat: Add skills registry service for Vercel Skills integration

- Create unified Skill type interface
- Implement skills-registry.ts with install/list/uninstall functions
- Uses gray-matter for SKILL.md YAML parsing
- Executes npx skills CLI via child_process"
```

---

## Task 2: Add IPC Handlers

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Add imports to main.ts**

Add at line 11 (after database imports):

```typescript
import {
    listInstalledSkills,
    installSkill,
    uninstallSkill,
    searchSkills,
} from './skills-registry';
```

**Step 2: Add IPC handlers to main.ts**

Add at end of file (after line 148):

```typescript
// IPC handlers — Skills Registry
ipcMain.handle('skills:list', async () => {
    return listInstalledSkills();
});
ipcMain.handle('skills:install', async (_event, skillId: string) => {
    return installSkill(skillId);
});
ipcMain.handle('skills:uninstall', async (_event, skillId: string) => {
    return uninstallSkill(skillId);
});
ipcMain.handle('skills:search', async (_event, query?: string) => {
    return searchSkills(query);
});
```

**Step 3: Update preload.ts - Add skills interface**

Add to `ElectronAPI` interface after `ai` section (after line 37):

```typescript
    // Skills
    skills: {
        list: () => Promise<import('../src/types/skill').Skill[]>;
        install: (skillId: string) => Promise<import('../src/types/skill').SkillInstallResult>;
        uninstall: (skillId: string) => Promise<{ success: boolean; error?: string }>;
        search: (query?: string) => Promise<import('../src/types/skill').SkillMetadata[]>;
    };
```

**Step 4: Update preload.ts - Add skills implementation**

Add to `electronAPI` object after `ai` section (after line 91):

```typescript
    // Skills
    skills: {
        list: () => ipcRenderer.invoke('skills:list'),
        install: (skillId: string) => ipcRenderer.invoke('skills:install', skillId),
        uninstall: (skillId: string) => ipcRenderer.invoke('skills:uninstall', skillId),
        search: (query?: string) => ipcRenderer.invoke('skills:search', query),
    },
```

**Step 5: Update electron.d.ts - Add skills types**

Add to `Window.electron` interface after `ai` section (after line 30):

```typescript
            skills: {
                list: () => Promise<import('../types/skill').Skill[]>;
                install: (skillId: string) => Promise<import('../types/skill').SkillInstallResult>;
                uninstall: (skillId: string) => Promise<{ success: boolean; error?: string }>;
                search: (query?: string) => Promise<import('../types/skill').SkillMetadata[]>;
            };
```

**Step 6: Build to verify no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: Add IPC handlers for skills registry

- Add skills:list, skills:install, skills:uninstall, skills:search handlers
- Expose skills API via preload bridge
- Update TypeScript definitions"
```

---

## Task 3: Create Skills Browser Component

**Files:**
- Create: `src/components/SkillsBrowser.tsx`

**Step 1: Create the SkillsBrowser component**

Create `src/components/SkillsBrowser.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import type { Skill, SkillMetadata } from '../types/skill';

interface SkillsBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: (skill: Skill) => void;
}

export const SkillsBrowser: React.FC<SkillsBrowserProps> = ({
    isOpen,
    onClose,
    onInstall,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableSkills, setAvailableSkills] = useState<SkillMetadata[]>([]);
    const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
    const [installing, setInstalling] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load available and installed skills
    useEffect(() => {
        if (isOpen) {
            loadSkills();
        }
    }, [isOpen]);

    const loadSkills = async () => {
        setIsLoading(true);
        try {
            const [available, installed] = await Promise.all([
                window.electron.skills.search(searchQuery || undefined),
                window.electron.skills.list(),
            ]);
            setAvailableSkills(available);
            setInstalledSkills(installed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load skills');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadSkills();
    };

    const handleInstall = async (skillId: string) => {
        setInstalling(skillId);
        setError(null);
        try {
            const result = await window.electron.skills.install(skillId);
            if (result.success && result.skill) {
                setInstalledSkills([...installedSkills, result.skill]);
                onInstall(result.skill);
            } else {
                setError(result.error || 'Failed to install skill');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to install skill');
        } finally {
            setInstalling(null);
        }
    };

    const isInstalled = (skillId: string) => {
        return installedSkills.some(s => s.id === skillId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Browse Skills</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="p-4 border-b border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skills..."
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </form>

                {/* Error */}
                {error && (
                    <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Skills List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="text-center text-gray-400 py-8">Loading...</div>
                    ) : availableSkills.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">No skills found</div>
                    ) : (
                        availableSkills.map((skill) => (
                            <div
                                key={skill.id}
                                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">{skill.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1">{skill.description}</p>
                                        <p className="text-xs text-gray-500 mt-2">by {skill.owner}</p>
                                    </div>
                                    <button
                                        onClick={() => handleInstall(skill.id)}
                                        disabled={isInstalled(skill.id) || installing === skill.id}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            isInstalled(skill.id)
                                                ? 'bg-green-600/20 text-green-400 cursor-not-allowed'
                                                : installing === skill.id
                                                ? 'bg-gray-600 text-gray-400 cursor-wait'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isInstalled(skill.id) ? 'Installed' : installing === skill.id ? 'Installing...' : 'Install'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 text-center">
                    <a
                        href="https://skills.sh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        Browse more at skills.sh
                    </a>
                </div>
            </div>
        </div>
    );
};
```

**Step 2: Verify component was created**

Run: `ls -la src/components/SkillsBrowser.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add src/components/SkillsBrowser.tsx
git commit -m "feat: Add SkillsBrowser component

- Modal dialog for browsing and installing skills
- Search functionality with loading states
- Install button with status feedback
- Links to skills.sh for more skills"
```

---

## Task 4: Update SkillsList Component

**Files:**
- Modify: `src/components/SkillsList.tsx`

**Step 1: Replace SkillsList component content**

Replace entire content of `src/components/SkillsList.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useAgentStore } from '../stores/agent-store';
import { SkillsBrowser } from './SkillsBrowser';
import type { Skill } from '../types/skill';

export const SkillsList: React.FC = () => {
    const skills = useAgentStore((state) => state.skills);
    const toggleSkill = useAgentStore((state) => state.toggleSkill);
    const [showBrowser, setShowBrowser] = useState(false);

    // Get source badge color
    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'vercel':
                return 'bg-purple-600/20 text-purple-400';
            case 'builtin':
                return 'bg-blue-600/20 text-blue-400';
            default:
                return 'bg-gray-600/20 text-gray-400';
        }
    };

    // Handle skill installed from browser
    const handleSkillInstalled = (skill: Skill) => {
        // The skill is already added to the store by the parent component
        // This callback can be used for additional actions
        console.log('Skill installed:', skill.name);
    };

    return (
        <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Capabilities
                </h3>
                <button
                    onClick={() => setShowBrowser(true)}
                    className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                    title="Browse and install skills from skills.sh"
                >
                    + Add Skill
                </button>
            </div>

            {skills.length === 0 && (
                <div className="text-xs text-gray-500 italic">No skills loaded</div>
            )}

            {skills.map((skill) => (
                <div
                    key={skill.id}
                    className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1 mr-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200 truncate" title={skill.name}>
                                {skill.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getSourceBadge(skill.source || 'builtin')}`}>
                                {skill.source || 'builtin'}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate" title={skill.description}>
                            {skill.description}
                        </span>
                    </div>

                    <button
                        onClick={() => toggleSkill(skill.id)}
                        className={`
                            relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                            ${skill.isEnabled ? 'bg-blue-600' : 'bg-gray-600'}
                        `}
                        role="switch"
                        aria-checked={skill.isEnabled}
                    >
                        <span className="sr-only">Enable {skill.name}</span>
                        <span
                            className={`
                                inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                                ${skill.isEnabled ? 'translate-x-5' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>
            ))}

            <SkillsBrowser
                isOpen={showBrowser}
                onClose={() => setShowBrowser(false)}
                onInstall={handleSkillInstalled}
            />
        </div>
    );
};
```

**Step 2: Verify component was updated**

Run: `grep -n "SkillsBrowser" src/components/SkillsList.tsx`
Expected: Shows import and usage

**Step 3: Commit**

```bash
git add src/components/SkillsList.tsx
git commit -m "feat: Update SkillsList with Vercel skill support

- Add 'Add Skill' button to open browser
- Show skill source badge (builtin/vercel/local)
- Integrate SkillsBrowser modal"
```

---

## Task 5: Update Agent Store for Vercel Skills

**Files:**
- Modify: `src/stores/agent-store.ts`

**Step 1: Update Skill import in agent-store.ts**

Replace line 3:

```typescript
import { type Skill, skillsManager } from '../utils/skillsManager';
```

With:

```typescript
import { type Skill } from '../types/skill';
import { skillsManager } from '../utils/skillsManager';
```

**Step 2: Update skills initialization in initialize function**

Find the `initialize` function around line 64-69 and update the skills loading:

Replace:
```typescript
            // 0. Load Skills
            const initialSkills = skillsManager.getSkills();
            set({ skills: initialSkills });
```

With:
```typescript
            // 0. Load Skills (built-in + installed Vercel skills)
            const builtInSkills = skillsManager.getSkills();
            let vercelSkills: Skill[] = [];
            try {
                vercelSkills = await window.electron.skills.list();
            } catch (err) {
                console.warn('Could not load Vercel skills:', err);
            }

            // Merge skills, preferring loaded state for existing skills
            const currentSkills = get().skills;
            const allSkills = [...builtInSkills, ...vercelSkills].map(skill => {
                const existing = currentSkills.find(s => s.id === skill.id);
                if (existing) {
                    return { ...skill, isEnabled: existing.isEnabled };
                }
                return skill;
            });

            set({ skills: allSkills });
```

**Step 3: Add installSkill action to AgentState interface**

Add to `AgentState` interface after `toggleSkill` (around line 38):

```typescript
    installSkill: (skillId: string) => Promise<void>;
```

**Step 4: Add installSkill implementation to store**

Add after `toggleSkill` implementation (around line 224):

```typescript
    installSkill: async (skillId: string) => {
        try {
            const result = await window.electron.skills.install(skillId);
            if (result.success && result.skill) {
                set((state) => ({
                    skills: [...state.skills, result.skill!],
                }));
            }
        } catch (error) {
            console.error('Failed to install skill:', error);
        }
    },
```

**Step 5: Build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/stores/agent-store.ts
git commit -m "feat: Update agent store to load Vercel skills

- Merge built-in and Vercel installed skills on init
- Add installSkill action for programmatic installation
- Preserve skill enabled state across reloads"
```

---

## Task 6: Update skillsManager for Unified Type

**Files:**
- Modify: `src/utils/skillsManager.ts`

**Step 1: Update imports and interface**

Replace lines 1-8:

```typescript
export interface Skill {
    id: string;
    name: string;
    description: string;
    triggers: string[]; // Keywords or phrases that might trigger this skill
    execute: (context: any) => Promise<string | any>;
    isEnabled: boolean;
}
```

With:

```typescript
import type { Skill } from '../types/skill';
```

**Step 2: Update built-in skills to match new interface**

Replace the `loadSkills` method's skill registrations with:

```typescript
    private loadSkills() {
        // Basic Echo Skill
        this.registerSkill({
            id: 'echo',
            name: 'Echo',
            description: 'Repeats back what you say.',
            source: 'builtin',
            triggers: ['echo', 'repeat', 'say'],
            isEnabled: true,
            execute: async (context: any) => {
                return `Echo: ${context.message || 'nothing to echo'}`;
            },
        });

        // System Info Skill
        this.registerSkill({
            id: 'system_info',
            name: 'System Info',
            description: 'Returns basic system information (platform, arch).',
            source: 'builtin',
            triggers: ['system info', 'os version', 'platform'],
            isEnabled: true,
            execute: async (context: any) => {
                if (typeof window !== 'undefined' && window.navigator) {
                    return `Platform: ${window.navigator.platform}, User Agent: ${window.navigator.userAgent}`;
                }
                return 'System info not available in this context.';
            },
        });
    }
```

**Step 3: Update class property type**

Change line 11:

```typescript
    private skills: Map<string, Skill> = new Map();
```

To:

```typescript
    private skills: Map<string, Skill & { execute?: (context: any) => Promise<any>; triggers?: string[] }> = new Map();
```

**Step 4: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/utils/skillsManager.ts
git commit -m "refactor: Update skillsManager to use unified Skill type

- Import Skill from types/skill.ts
- Update built-in skills with source field
- Maintain backward compatibility with execute/triggers"
```

---

## Task 7: Build and Test

**Files:**
- None (verification only)

**Step 1: Clean build**

Run: `rm -rf dist && npm run build`
Expected: Build completes without errors

**Step 2: Start the app**

Run: `npm start`
Expected: App launches

**Step 3: Manual test - Open Agent Mode**

1. Click on "Agent" tab
2. Open the Memory Sidebar (left panel)
3. Verify "Capabilities" section shows built-in skills (Echo, System Info)
4. Verify "+ Add Skill" button is visible

**Step 4: Manual test - Browse Skills**

1. Click "+ Add Skill" button
2. Verify SkillsBrowser modal opens
3. Verify search input works
4. Verify skill cards display with Install buttons

**Step 5: Manual test - Install a skill**

1. Click "Install" on a skill
2. Verify loading state shows
3. Note: Actual installation requires network and npx

**Step 6: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: Any fixes from testing"
```

---

## Task 8: Final Commit and Documentation

**Files:**
- Modify: `package.json` (version bump)

**Step 1: Update version in package.json**

Bump version to indicate new feature (e.g., 0.x.x -> 0.x.1 or minor version)

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat: Complete Vercel Skills integration

Users can now:
- Browse skills from skills.sh via SkillsBrowser modal
- Install skills with one click (no code required)
- Toggle skills on/off in Agent Mode
- Skills are persisted and loaded on app start

Architecture:
- skills-registry.ts handles npx skills CLI execution
- IPC handlers expose skills API to renderer
- SkillsBrowser provides discovery UI
- Unified Skill type supports both builtin and vercel sources"
```

---

## Verification Checklist

After implementation, verify:

- [ ] `npm run build` completes without errors
- [ ] App starts with `npm start`
- [ ] Agent Mode shows "Capabilities" section in sidebar
- [ ] "+ Add Skill" button opens SkillsBrowser modal
- [ ] SkillsBrowser shows available skills
- [ ] Search filters skills
- [ ] Install button shows loading state
- [ ] Installed skills appear in the list with "vercel" badge
- [ ] Skill toggles persist across app restarts
- [ ] TypeScript types are correct (no `any` leaks)

---

## Future Enhancements (Out of Scope)

- Real skills.sh API integration for search
- Skill update notifications
- Skill ratings and reviews
- Custom skill creation UI
- Skill conflict detection
