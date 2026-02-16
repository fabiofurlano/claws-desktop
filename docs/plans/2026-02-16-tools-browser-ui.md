# Tools Browser UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a visual tool browser to discover, search, filter, and connect 250+ Composio tools (GitHub, Slack, Gmail, etc.) with OAuth authorization flow.

**Architecture:** Modal-based browser component (ToolsBrowser.tsx) with search/filter capabilities, ToolCard components for each tool, OAuth polling for connection status, and ConnectedToolsSection for managing enabled tools. Uses existing IPC patterns from SkillsBrowser.

**Tech Stack:** React, TypeScript, Tailwind CSS, Composio SDK, SQLite

---

## Task 1: Add TypeScript Types

**Files:**
- Modify: `claws-desktop/src/types/electron.d.ts`

**Step 1: Add new interfaces**

Add after existing interfaces:

```typescript
// Composio Tool from API
export interface ComposioTool {
    name: string;
    slug: string;
    description: string;
    logo: string;
    categories: string[];
}

// Connected Tool stored in database
export interface ConnectedTool {
    id: string;
    connection_id: string;
    tool_name: string;
    tool_slug: string;
    is_enabled: number;
    config: string | null;
    created_at: number;
}

// Connection status from OAuth flow
export interface ConnectionStatus {
    status: 'pending' | 'completed' | 'active' | 'failed' | 'inactive';
    message?: string;
}
```

**Step 2: Extend mcp interface in Window.electron**

Add new methods to the `mcp` object:

```typescript
mcp: {
    // Existing
    getConnections: () => Promise<McpConnection[]>;
    createConnection: (data: { name: string; type: string; api_key: string }) => Promise<{ id: string }>;
    updateConnection: (id: string, updates: { api_key?: string; is_enabled?: number }) => Promise<unknown>;
    deleteConnection: (id: string) => Promise<unknown>;
    listTools: (apiKey: string) => Promise<ComposioTool[]>;
    // NEW
    getConnectedTools: (connectionId?: string) => Promise<ConnectedTool[]>;
    connectTool: (toolSlug: string) => Promise<{ redirectUrl: string | null; connectionId: string }>;
    checkConnectionStatus: (connectionId: string) => Promise<ConnectionStatus>;
    enableTool: (toolId: string) => Promise<unknown>;
    disableTool: (toolId: string) => Promise<unknown>;
    removeTool: (toolId: string) => Promise<unknown>;
}
```

**Step 3: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes with no errors

**Step 4: Commit**

```bash
git add claws-desktop/src/types/electron.d.ts
git commit -m "feat: Add TypeScript types for Composio tools

- ComposioTool: Tool from Composio API
- ConnectedTool: Tool stored in database
- ConnectionStatus: OAuth flow status
- Extended mcp interface with 6 new methods

Files: src/types/electron.d.ts"
```

---

## Task 2: Add IPC Bindings in Preload

**Files:**
- Modify: `claws-desktop/electron/preload.ts`

**Step 1: Add new IPC bindings to mcp object**

Find the `mcp:` section in the `electron` object and add after `listTools`:

```typescript
    // NEW: Tool management
    getConnectedTools: (connectionId?: string) =>
        ipcRenderer.invoke('mcp:getConnectedTools', connectionId),
    connectTool: (toolSlug: string) =>
        ipcRenderer.invoke('mcp:connectTool', toolSlug),
    checkConnectionStatus: (connectionId: string) =>
        ipcRenderer.invoke('mcp:checkConnectionStatus', connectionId),
    enableTool: (toolId: string) =>
        ipcRenderer.invoke('mcp:enableTool', toolId),
    disableTool: (toolId: string) =>
        ipcRenderer.invoke('mcp:disableTool', toolId),
    removeTool: (toolId: string) =>
        ipcRenderer.invoke('mcp:removeTool', toolId),
```

**Step 2: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add claws-desktop/electron/preload.ts
git commit -m "feat: Add IPC bindings for tool management

New IPC channels:
- mcp:getConnectedTools
- mcp:connectTool
- mcp:checkConnectionStatus
- mcp:enableTool
- mcp:disableTool
- mcp:removeTool

Files: electron/preload.ts"
```

---

## Task 3: Add IPC Handlers in Main

**Files:**
- Modify: `claws-desktop/electron/main.ts`

**Step 1: Import database functions**

Find the database imports and add:

```typescript
import {
    initDatabase, closeDatabase,
    createMcpConnection, getMcpConnections, updateMcpConnection, deleteMcpConnection,
    getConnectedTools, addConnectedTool, toggleConnectedTool, removeConnectedTool
} from './database.js';
```

**Step 2: Add IPC handlers after existing mcp handlers**

Add after the existing `mcp:listTools` handler:

```typescript
// Get connected tools from database
ipcMain.handle('mcp:getConnectedTools', async (_event, connectionId?: string) => {
    return getConnectedTools(connectionId);
});

// Connect a tool (initiate OAuth)
ipcMain.handle('mcp:connectTool', async (_event, toolSlug: string) => {
    try {
        const { connectTool, getToolkitDetails } = await import('./composio-service.js');

        // Get active Composio connection
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (!composioConn) {
            throw new Error('No active Composio connection');
        }

        // Get toolkit details to find authConfigId
        const toolkit = await getToolkitDetails(toolSlug);
        const authConfig = toolkit.authConfigDetails?.[0];

        if (!authConfig?.id) {
            throw new Error('No auth config found for this tool');
        }

        // Initiate connection
        const result = await connectTool('default-user', authConfig.id);

        // Store pending connection in database
        const toolId = `tool-${Date.now()}`;
        addConnectedTool({
            id: toolId,
            connection_id: composioConn.id,
            tool_name: toolkit.name,
            tool_slug: toolSlug,
            config: JSON.stringify({ pendingConnectionId: result.connectionId }),
        });

        return result;
    } catch (error) {
        console.error('[IPC] Failed to connect tool:', error);
        throw error;
    }
});

// Check connection status
ipcMain.handle('mcp:checkConnectionStatus', async (_event, connectionId: string) => {
    try {
        const { checkConnectionStatus } = await import('./composio-service.js');
        return await checkConnectionStatus(connectionId);
    } catch (error) {
        console.error('[IPC] Failed to check status:', error);
        return { status: 'failed', message: String(error) };
    }
});

// Enable connected tool
ipcMain.handle('mcp:enableTool', async (_event, toolId: string) => {
    return toggleConnectedTool(toolId, 1);
});

// Disable connected tool
ipcMain.handle('mcp:disableTool', async (_event, toolId: string) => {
    return toggleConnectedTool(toolId, 0);
});

// Remove connected tool
ipcMain.handle('mcp:removeTool', async (_event, toolId: string) => {
    return removeConnectedTool(toolId);
});
```

**Step 3: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add claws-desktop/electron/main.ts
git commit -m "feat: Add IPC handlers for tool management

Handlers added:
- mcp:getConnectedTools: Get tools from database
- mcp:connectTool: Initiate OAuth + store in DB
- mcp:checkConnectionStatus: Poll OAuth status
- mcp:enableTool/disableTool: Toggle tool state
- mcp:removeTool: Delete tool from DB

Files: electron/main.ts"
```

---

## Task 4: Create ToolCard Component

**Files:**
- Create: `claws-desktop/src/components/ToolCard.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import type { ComposioTool, ConnectedTool } from '../types/electron';

interface ToolCardProps {
    tool: ComposioTool;
    connectedTool?: ConnectedTool;
    isConnecting: boolean;
    onConnect: () => void;
    onToggle: (enabled: boolean) => void;
    isAgent: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({
    tool,
    connectedTool,
    isConnecting,
    onConnect,
    onToggle,
    isAgent,
}) => {
    const isConnected = !!connectedTool;
    const isEnabled = connectedTool?.is_enabled === 1;

    return (
        <div className={`group rounded-xl border p-4 transition-all duration-200 ${isAgent
            ? 'bg-agent-surfaceAlt border-agent-border hover:border-agent-primary/40'
            : 'bg-white border-chat-border hover:border-chat-primary/40'
            }`}>
            {/* Logo + Name */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isAgent ? 'bg-agent-surface' : 'bg-gray-100'}`}>
                    {tool.logo ? (
                        <img src={tool.logo} alt={tool.name} className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                        <span className="text-xl">🔧</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold truncate ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        {tool.name}
                    </h4>
                    <p className={`text-xs line-clamp-2 mt-0.5 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        {tool.description}
                    </p>
                </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 mb-3">
                {tool.categories.slice(0, 3).map((cat) => (
                    <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full ${isAgent
                        ? 'bg-agent-primary/10 text-agent-primary'
                        : 'bg-chat-primary/10 text-chat-primary'
                        }`}>
                        {cat}
                    </span>
                ))}
            </div>

            {/* Action Button */}
            {isConnecting ? (
                <button disabled className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isAgent
                    ? 'bg-agent-surface text-agent-muted'
                    : 'bg-gray-100 text-chat-muted'
                    }`}>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                </button>
            ) : isConnected ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => onToggle(!isEnabled)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            isEnabled
                                ? isAgent
                                    ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                                    : 'bg-green-100 text-green-600 border border-green-200'
                                : isAgent
                                    ? 'bg-gray-700 text-gray-400'
                                    : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        {isEnabled ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                On
                            </span>
                        ) : '○ Off'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={onConnect}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30 active:scale-[0.98]'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20 active:scale-[0.98]'
                        }`}
                >
                    + Connect
                </button>
            )}
        </div>
    );
};

export default ToolCard;
```

**Step 2: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add claws-desktop/src/components/ToolCard.tsx
git commit -m "feat: Create ToolCard component

Features:
- Logo display with fallback icon
- Tool name + description (2-line clamp)
- Category badges (max 3)
- Connect/On/Off button states
- Pulse animation for active tools
- Dark/light theme support

Files: src/components/ToolCard.tsx"
```

---

## Task 5: Create ToolsBrowser Component

**Files:**
- Create: `claws-desktop/src/components/ToolsBrowser.tsx`

**Step 1: Create the modal component**

```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ComposioTool, ConnectedTool, McpConnection } from '../types/electron';
import { ToolCard } from './ToolCard';

interface ToolsBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    isAgent: boolean;
    connection: McpConnection;
}

export const ToolsBrowser: React.FC<ToolsBrowserProps> = ({
    isOpen,
    onClose,
    isAgent,
    connection,
}) => {
    const [tools, setTools] = useState<ComposioTool[]>([]);
    const [connectedTools, setConnectedTools] = useState<Map<string, ConnectedTool>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [connectingSlugs, setConnectingSlugs] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        tools.forEach(t => t.categories.forEach(c => cats.add(c)));
        return Array.from(cats).sort();
    }, [tools]);

    // Filter tools by search and category
    const filteredTools = useMemo(() => {
        return tools.filter(tool => {
            const matchesSearch = !searchQuery ||
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !selectedCategory ||
                tool.categories.includes(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [tools, searchQuery, selectedCategory]);

    // Load tools and connected tools
    useEffect(() => {
        if (!isOpen || !connection.api_key) return;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Load available tools
                const toolsData = await window.electron.mcp.listTools(connection.api_key!);
                setTools(toolsData || []);

                // Load connected tools
                const connected = await window.electron.mcp.getConnectedTools(connection.id);
                const map = new Map<string, ConnectedTool>();
                (connected || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
                setConnectedTools(map);
            } catch (err) {
                console.error('Failed to load tools:', err);
                setError('Failed to load tools. Check your connection.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen, connection.id, connection.api_key]);

    // Poll connection status
    const pollConnectionStatus = useCallback(async (connectionId: string, toolSlug: string) => {
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const status = await window.electron.mcp.checkConnectionStatus(connectionId);

            if (status.status === 'active' || status.status === 'completed') {
                // Refresh connected tools
                const connected = await window.electron.mcp.getConnectedTools(connection.id);
                const map = new Map<string, ConnectedTool>();
                (connected || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
                setConnectedTools(map);
                setConnectingSlugs(prev => {
                    const next = new Set(prev);
                    next.delete(toolSlug);
                    return next;
                });
                return true;
            }

            if (status.status === 'failed') {
                setConnectingSlugs(prev => {
                    const next = new Set(prev);
                    next.delete(toolSlug);
                    return next;
                });
                setError(`Failed to connect ${toolSlug}`);
                return false;
            }
        }

        setConnectingSlugs(prev => {
            const next = new Set(prev);
            next.delete(toolSlug);
            return next;
        });
        setError('Connection timed out');
        return false;
    }, [connection.id]);

    // Handle connect
    const handleConnect = async (tool: ComposioTool) => {
        setConnectingSlugs(prev => new Set(prev).add(tool.slug));
        setError(null);

        try {
            const result = await window.electron.mcp.connectTool(tool.slug);

            if (result.redirectUrl) {
                // Open OAuth URL in new window
                window.open(result.redirectUrl, '_blank', 'width=600,height=800');
            }

            // Poll for completion
            if (result.connectionId) {
                await pollConnectionStatus(result.connectionId, tool.slug);
            }
        } catch (err) {
            console.error('Failed to connect:', err);
            setError(`Failed to connect ${tool.name}`);
            setConnectingSlugs(prev => {
                const next = new Set(prev);
                next.delete(tool.slug);
                return next;
            });
        }
    };

    // Handle toggle
    const handleToggle = async (tool: ComposioTool, enabled: boolean) => {
        const connected = connectedTools.get(tool.slug);
        if (!connected) return;

        if (enabled) {
            await window.electron.mcp.enableTool(connected.id);
        } else {
            await window.electron.mcp.disableTool(connected.id);
        }

        // Refresh
        const connectedData = await window.electron.mcp.getConnectedTools(connection.id);
        const map = new Map<string, ConnectedTool>();
        (connectedData || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
        setConnectedTools(map);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`w-[90vw] max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col ${isAgent
                ? 'bg-agent-surface border border-agent-border'
                : 'bg-white border border-chat-border'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isAgent ? 'border-agent-border' : 'border-chat-border'}`}>
                    <div>
                        <h2 className={`text-lg font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                            Browse Tools
                        </h2>
                        <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            {tools.length} tools available • {connectedTools.size} connected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isAgent
                            ? 'text-agent-muted hover:bg-agent-surfaceAlt hover:text-agent-text'
                            : 'text-chat-muted hover:bg-gray-100 hover:text-chat-text'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search + Filters */}
                <div className={`px-6 py-4 border-b shrink-0 space-y-3 ${isAgent ? 'border-agent-border' : 'border-chat-border'}`}>
                    {/* Search */}
                    <div className="relative">
                        <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tools..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border outline-none transition-all ${isAgent
                                ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/50 focus:border-agent-primary'
                                : 'bg-gray-50 border-chat-border text-chat-text placeholder:text-chat-muted/50 focus:border-chat-primary'
                                }`}
                        />
                    </div>

                    {/* Category filters */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedCategory
                                ? isAgent
                                    ? 'bg-agent-primary text-white'
                                    : 'bg-chat-primary text-white'
                                : isAgent
                                    ? 'bg-agent-surfaceAlt text-agent-muted hover:bg-agent-surface'
                                    : 'bg-gray-100 text-chat-muted hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat
                                    ? isAgent
                                        ? 'bg-agent-primary text-white'
                                        : 'bg-chat-primary text-white'
                                    : isAgent
                                        ? 'bg-agent-surfaceAlt text-agent-muted hover:bg-agent-surface'
                                        : 'bg-gray-100 text-chat-muted hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg text-sm flex items-center justify-between animate-fade-in shrink-0 ${isAgent
                        ? 'bg-red-900/20 text-red-400 border border-red-800/50'
                        : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">×</button>
                    </div>
                )}

                {/* Tools Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className={`rounded-xl p-4 animate-pulse ${isAgent ? 'bg-agent-surfaceAlt' : 'bg-gray-100'}`}>
                                    <div className={`w-12 h-12 rounded-xl mb-3 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                    <div className={`h-4 rounded mb-2 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                    <div className={`h-3 rounded w-2/3 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                </div>
                            ))}
                        </div>
                    ) : filteredTools.length === 0 ? (
                        <div className={`text-center py-12 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            <p className="text-3xl mb-2">🔍</p>
                            <p className="font-medium">No tools found</p>
                            <p className="text-sm mt-1">Try a different search or category</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredTools.map(tool => (
                                <ToolCard
                                    key={tool.slug}
                                    tool={tool}
                                    connectedTool={connectedTools.get(tool.slug)}
                                    isConnecting={connectingSlugs.has(tool.slug)}
                                    onConnect={() => handleConnect(tool)}
                                    onToggle={(enabled) => handleToggle(tool, enabled)}
                                    isAgent={isAgent}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-3 border-t shrink-0 ${isAgent ? 'border-agent-border bg-agent-bg/50' : 'border-chat-border bg-gray-50'}`}>
                    <p className={`text-xs text-center ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Discover more at{' '}
                        <a href="https://composio.dev" target="_blank" rel="noopener" className={`underline ${isAgent ? 'text-agent-primary' : 'text-chat-primary'}`}>
                            composio.dev
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ToolsBrowser;
```

**Step 2: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add claws-desktop/src/components/ToolsBrowser.tsx
git commit -m "feat: Create ToolsBrowser modal component

Features:
- Modal overlay with backdrop blur
- Search with real-time filtering
- Category filter chips (horizontal scroll)
- Responsive grid: 2/3/4 columns
- Loading skeleton animation
- Empty state
- OAuth polling for connection status
- Dark/light theme support

Files: src/components/ToolsBrowser.tsx"
```

---

## Task 6: Create ConnectedToolsSection Component

**Files:**
- Create: `claws-desktop/src/components/ConnectedToolsSection.tsx`

**Step 1: Create the component**

```typescript
import React, { useState, useEffect } from 'react';
import type { ConnectedTool, McpConnection } from '../types/electron';

interface ConnectedToolsSectionProps {
    isAgent: boolean;
    connection: McpConnection;
    onBrowseTools: () => void;
}

export const ConnectedToolsSection: React.FC<ConnectedToolsSectionProps> = ({
    isAgent,
    connection,
    onBrowseTools,
}) => {
    const [tools, setTools] = useState<ConnectedTool[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTools();
    }, [connection.id]);

    const loadTools = async () => {
        setLoading(true);
        try {
            const data = await window.electron.mcp.getConnectedTools(connection.id);
            setTools(data || []);
        } catch (err) {
            console.error('Failed to load connected tools:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (tool: ConnectedTool, enabled: boolean) => {
        if (enabled) {
            await window.electron.mcp.enableTool(tool.id);
        } else {
            await window.electron.mcp.disableTool(tool.id);
        }
        await loadTools();
    };

    const handleRemove = async (tool: ConnectedTool) => {
        if (!confirm(`Remove "${tool.tool_name}"?`)) return;
        await window.electron.mcp.removeTool(tool.id);
        await loadTools();
    };

    if (loading) {
        return (
            <div className={`p-4 rounded-xl ${isAgent ? 'bg-agent-surfaceAlt' : 'bg-gray-50'}`}>
                <div className="animate-pulse flex gap-2">
                    <div className={`h-6 w-20 rounded ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                    <div className={`h-6 w-20 rounded ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                </div>
            </div>
        );
    }

    if (tools.length === 0) {
        return (
            <div className={`p-4 rounded-xl border-2 border-dashed text-center ${isAgent
                ? 'border-agent-border text-agent-muted'
                : 'border-chat-border text-chat-muted'
                }`}>
                <p className="text-sm">No tools connected yet</p>
                <button
                    onClick={onBrowseTools}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                        }`}
                >
                    Browse Tools
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                    Connected Tools ({tools.length})
                </h4>
                <button
                    onClick={onBrowseTools}
                    className={`text-xs font-medium transition-colors ${isAgent
                        ? 'text-agent-primary hover:text-agent-primary/80'
                        : 'text-chat-primary hover:text-chat-primary/80'
                        }`}
                >
                    + Add More
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {tools.map(tool => (
                    <div
                        key={tool.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isAgent
                            ? 'bg-agent-surfaceAlt border border-agent-border'
                            : 'bg-gray-50 border border-chat-border'
                            }`}
                    >
                        {/* Status dot */}
                        <div className={`w-2 h-2 rounded-full ${tool.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />

                        {/* Name */}
                        <span className={isAgent ? 'text-agent-text' : 'text-chat-text'}>
                            {tool.tool_name}
                        </span>

                        {/* Toggle */}
                        <button
                            onClick={() => handleToggle(tool, !tool.is_enabled)}
                            className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                tool.is_enabled
                                    ? isAgent
                                        ? 'text-green-400 hover:bg-green-900/20'
                                        : 'text-green-600 hover:bg-green-100'
                                    : isAgent
                                        ? 'text-agent-muted hover:bg-agent-surface'
                                        : 'text-chat-muted hover:bg-white'
                            }`}
                        >
                            {tool.is_enabled ? 'On' : 'Off'}
                        </button>

                        {/* Remove */}
                        <button
                            onClick={() => handleRemove(tool)}
                            className={`text-xs opacity-50 hover:opacity-100 transition-opacity ${isAgent
                                ? 'text-red-400'
                                : 'text-red-500'
                                }`}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConnectedToolsSection;
```

**Step 2: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add claws-desktop/src/components/ConnectedToolsSection.tsx
git commit -m "feat: Create ConnectedToolsSection component

Features:
- List connected tools with status
- Enable/disable toggle
- Remove button
- Empty state with "Browse Tools" button
- Dark/light theme support

Files: src/components/ConnectedToolsSection.tsx"
```

---

## Task 7: Integrate into McpSettings

**Files:**
- Modify: `claws-desktop/src/components/McpSettings.tsx`

**Step 1: Add imports at top**

```typescript
import { ToolsBrowser } from './ToolsBrowser';
import { ConnectedToolsSection } from './ConnectedToolsSection';
```

**Step 2: Add state after existing state**

```typescript
    const [showToolsBrowser, setShowToolsBrowser] = useState(false);
    const [activeConnection, setActiveConnection] = useState<McpConnection | null>(null);
```

**Step 3: Add "Browse Tools" button and ConnectedToolsSection**

Find the connections list section (after the connections.map block) and modify:

Replace:
```typescript
            {/* Connections list */}
            {connections.length === 0 && !showAddForm ? (
```

With:
```typescript
            {/* Browse Tools button (when connection exists) */}
            {connections.length > 0 && !showAddForm && (
                <button
                    onClick={() => {
                        const conn = connections.find(c => c.is_enabled);
                        if (conn) {
                            setActiveConnection(conn);
                            setShowToolsBrowser(true);
                        }
                    }}
                    className={`w-full p-4 rounded-xl border-2 border-dashed text-center transition-colors ${isAgent
                        ? 'border-agent-border hover:border-agent-primary/50 text-agent-muted hover:text-agent-text'
                        : 'border-chat-border hover:border-chat-primary/50 text-chat-muted hover:text-chat-text'
                        }`}
                >
                    <span className="text-2xl mb-1 block">🔧</span>
                    <span className="font-medium">Browse 250+ Tools</span>
                    <span className="text-xs block mt-1">GitHub, Slack, Gmail, Notion & more</span>
                </button>
            )}

            {/* Connected Tools Section */}
            {connections.filter(c => c.is_enabled).map(conn => (
                <ConnectedToolsSection
                    key={conn.id}
                    isAgent={isAgent}
                    connection={conn}
                    onBrowseTools={() => {
                        setActiveConnection(conn);
                        setShowToolsBrowser(true);
                    }}
                />
            ))}

            {/* Connections list */}
            {connections.length === 0 && !showAddForm ? (
```

**Step 4: Add ToolsBrowser modal at end of return (before closing div)**

Add before the final `</div>`:

```typescript
            {/* Tools Browser Modal */}
            {activeConnection && (
                <ToolsBrowser
                    isOpen={showToolsBrowser}
                    onClose={() => {
                        setShowToolsBrowser(false);
                        setActiveConnection(null);
                    }}
                    isAgent={isAgent}
                    connection={activeConnection}
                />
            )}
```

**Step 5: Build and verify**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

**Step 6: Commit**

```bash
git add claws-desktop/src/components/McpSettings.tsx
git commit -m "feat: Integrate ToolsBrowser into McpSettings

Changes:
- Added 'Browse 250+ Tools' button
- Added ConnectedToolsSection per connection
- Integrated ToolsBrowser modal
- Connected all interactions

Files: src/components/McpSettings.tsx"
```

---

## Task 8: Test and Document

**Files:**
- Modify: `claws-desktop/docs/COMPOSIO-INTEGRATION.md`

**Step 1: Update documentation**

Add section about Browse Tools:

```markdown
## Browsing & Connecting Tools

### Browse Available Tools

1. Go to **Settings** → **MCP**
2. Click **Browse 250+ Tools**
3. Search or filter by category
4. Click **Connect** on any tool

### Connect a Tool

1. Click "Connect" on the tool card
2. A new window opens for OAuth authorization
3. Authorize the tool
4. Tool shows "On" status with pulse animation

### Manage Connected Tools

- **Enable/Disable**: Toggle on/off without disconnecting
- **Remove**: Completely remove the connection
- Tools show as chips under the connection
```

**Step 2: Run integration test**

Run: `cd claws-desktop && npm run build`
Expected: Build passes

Run: `./scripts/test-composio.sh`
Expected: All tests pass

**Step 3: Final commit**

```bash
git add claws-desktop/docs/COMPOSIO-INTEGRATION.md
git commit -m "docs: Add Browse Tools section to Composio docs

Added documentation for:
- Browsing available tools
- Connecting tools via OAuth
- Managing connected tools

Files: docs/COMPOSIO-INTEGRATION.md"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add TypeScript types | electron.d.ts |
| 2 | Add IPC bindings | preload.ts |
| 3 | Add IPC handlers | main.ts |
| 4 | Create ToolCard | ToolCard.tsx |
| 5 | Create ToolsBrowser | ToolsBrowser.tsx |
| 6 | Create ConnectedToolsSection | ConnectedToolsSection.tsx |
| 7 | Integrate into McpSettings | McpSettings.tsx |
| 8 | Update docs | COMPOSIO-INTEGRATION.md |

## Verification

1. `npm run build` - must pass
2. `npm run electron:dev` - start app
3. Settings → MCP → Browse Tools
4. Search/filter tools
5. Connect a tool via OAuth
6. Verify connected status with pulse
7. Toggle enable/disable
8. `./scripts/test-composio.sh`
