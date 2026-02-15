# Composio MCP Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Composio's 500+ pre-built toolkits into Claws Desktop via MCP, allowing users to connect external services (GitHub, Slack, Gmail, etc.) through a simple UI.

**Architecture:** Composio acts as an MCP tool provider. We create a bridge layer that proxies Composio tools through our existing MCP server (port 3001), plus a UI in Settings to manage connected services.

**Tech Stack:** `@composio/core`, `@composio/mcp`, SQLite for connection storage, React for UI

---

## Prerequisites

- [x] Phase 1 complete (Electron + React + SQLite)
- [x] Phase 2 complete (MCP Server on port 3001)
- [ ] Composio API key (user must obtain from https://app.composio.dev)

---

## Task 1: Install Composio Dependencies

**Files:**
- Modify: `claws-desktop/package.json`

**Step 1: Install packages**

Run:
```bash
cd claws-desktop && npm install @composio/core @composio/mcp
```

Expected: Packages added to package.json without errors

**Step 2: Verify installation**

Run:
```bash
cd claws-desktop && npm ls @composio/core @composio/mcp
```

Expected: Both packages listed with versions

**Step 3: Test build still works**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add claws-desktop/package.json claws-desktop/package-lock.json
git commit -m "feat: Add Composio MCP dependencies

- @composio/core: Core SDK for Composio API
- @composio/mcp: MCP integration for tool bridging

Prepares for 500+ pre-built toolkit integration.

Files: package.json, package-lock.json"
```

---

## Task 2: Create Database Schema for MCP Connections

**Files:**
- Modify: `claws-desktop/electron/database.ts:33-105`

**Step 1: Write failing test (manual verification)**

We'll verify by checking the database structure after running the app.

**Step 2: Add new tables to database.ts**

In the `db.exec()` block, add these tables after the `providers` table:

```typescript
        -- MCP Connections (Composio and future integrations)
        CREATE TABLE IF NOT EXISTS mcp_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'composio',
            api_key TEXT,  -- Encrypted in production
            is_enabled INTEGER NOT NULL DEFAULT 1,
            config TEXT,   -- JSON for additional settings
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            last_used INTEGER
        );

        -- Connected Tools (tools enabled per connection)
        CREATE TABLE IF NOT EXISTS connected_tools (
            id TEXT PRIMARY KEY,
            connection_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            tool_slug TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            config TEXT,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            FOREIGN KEY (connection_id) REFERENCES mcp_connections(id) ON DELETE CASCADE
        );

        -- Index for fast tool lookup
        CREATE INDEX IF NOT EXISTS idx_connected_tools_connection ON connected_tools(connection_id);
        CREATE INDEX IF NOT EXISTS idx_connected_tools_enabled ON connected_tools(is_enabled);
```

**Step 3: Add helper functions at end of database.ts**

```typescript
// ==================== MCP CONNECTIONS ====================

export function createMcpConnection(connection: {
    id: string;
    name: string;
    type?: string;
    api_key?: string;
    config?: string;
}) {
    return getDatabase()
        .prepare(
            'INSERT INTO mcp_connections (id, name, type, api_key, config) VALUES (?, ?, ?, ?, ?)'
        )
        .run(connection.id, connection.name, connection.type || 'composio', connection.api_key || null, connection.config || null);
}

export function getMcpConnections() {
    return getDatabase()
        .prepare('SELECT * FROM mcp_connections ORDER BY created_at DESC')
        .all() as Array<{
            id: string;
            name: string;
            type: string;
            api_key: string | null;
            is_enabled: number;
            config: string | null;
            created_at: number;
            last_used: number | null;
        }>;
}

export function getMcpConnection(id: string) {
    return getDatabase()
        .prepare('SELECT * FROM mcp_connections WHERE id = ?')
        .get(id);
}

export function updateMcpConnection(id: string, updates: { api_key?: string; is_enabled?: number; config?: string }) {
    const sets: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.api_key !== undefined) { sets.push('api_key = ?'); values.push(updates.api_key); }
    if (updates.is_enabled !== undefined) { sets.push('is_enabled = ?'); values.push(updates.is_enabled); }
    if (updates.config !== undefined) { sets.push('config = ?'); values.push(updates.config); }

    if (sets.length === 0) return { changes: 0 };

    values.push(id);
    return getDatabase()
        .prepare(`UPDATE mcp_connections SET ${sets.join(', ')} WHERE id = ?`)
        .run(...values);
}

export function deleteMcpConnection(id: string) {
    return getDatabase()
        .prepare('DELETE FROM mcp_connections WHERE id = ?')
        .run(id);
}

// ==================== CONNECTED TOOLS ====================

export function addConnectedTool(tool: {
    id: string;
    connection_id: string;
    tool_name: string;
    tool_slug: string;
    config?: string;
}) {
    return getDatabase()
        .prepare(
            'INSERT INTO connected_tools (id, connection_id, tool_name, tool_slug, config) VALUES (?, ?, ?, ?, ?)'
        )
        .run(tool.id, tool.connection_id, tool.tool_name, tool.tool_slug, tool.config || null);
}

export function getConnectedTools(connectionId?: string) {
    if (connectionId) {
        return getDatabase()
            .prepare('SELECT * FROM connected_tools WHERE connection_id = ? AND is_enabled = 1')
            .all(connectionId);
    }
    return getDatabase()
        .prepare('SELECT * FROM connected_tools WHERE is_enabled = 1')
        .all();
}

export function removeConnectedTool(id: string) {
    return getDatabase()
        .prepare('DELETE FROM connected_tools WHERE id = ?')
        .run(id);
}

export function toggleConnectedTool(id: string, is_enabled: number) {
    return getDatabase()
        .prepare('UPDATE connected_tools SET is_enabled = ? WHERE id = ?')
        .run(is_enabled, id);
}
```

**Step 4: Build and verify**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add claws-desktop/electron/database.ts
git commit -m "feat: Add MCP connections and tools tables to SQLite

Tables added:
- mcp_connections: Store Composio API keys and config
- connected_tools: Track enabled tools per connection

Helper functions for CRUD operations included.

Files: electron/database.ts"
```

---

## Task 3: Create Composio Service Layer

**Files:**
- Create: `claws-desktop/electron/composio-service.ts`

**Step 1: Create the Composio service module**

```typescript
/**
 * Composio Service Layer
 * Handles Composio API integration and tool discovery
 */

import { Composio } from '@composio/core';
import { getMcpConnections, getConnectedTools, getMcpConnection } from './database.js';

let composioClient: Composio | null = null;

/**
 * Initialize Composio client with API key
 */
export function initComposio(apiKey: string): Composio {
    composioClient = new Composio({
        apiKey: apiKey,
    });
    return composioClient;
}

/**
 * Get the current Composio client
 */
export function getComposio(): Composio | null {
    return composioClient;
}

/**
 * List available tools from Composio
 * Returns tools the user can connect
 */
export async function listAvailableTools(apiKey?: string): Promise<Array<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    categories: string[];
}>> {
    const client = apiKey ? initComposio(apiKey) : composioClient;

    if (!client) {
        throw new Error('Composio not initialized. Provide API key.');
    }

    try {
        // Get list of available integrations/toolkits
        const integrations = await client.integrations.list();

        return integrations.map((integration: any) => ({
            name: integration.name || integration.displayName,
            slug: integration.slug || integration.name,
            description: integration.description || '',
            logo: integration.logoUrl || '',
            categories: integration.categories || [],
        }));
    } catch (error) {
        console.error('[Composio] Failed to list tools:', error);
        throw error;
    }
}

/**
 * Connect a tool (authorize via Composio)
 * Returns the auth URL for user to complete OAuth
 */
export async function connectTool(
    toolSlug: string,
    redirectUrl?: string
): Promise<{ authUrl: string; connectedAccountId: string }> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        const connection = await composioClient.connectedAccounts.initiate({
            integrationId: toolSlug,
            redirectUri: redirectUrl || 'http://localhost:3001/callback',
        });

        return {
            authUrl: connection.redirectUrl,
            connectedAccountId: connection.connectedAccountId,
        };
    } catch (error) {
        console.error(`[Composio] Failed to connect ${toolSlug}:`, error);
        throw error;
    }
}

/**
 * Check if a tool connection is complete
 */
export async function checkConnectionStatus(connectedAccountId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
}> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        const account = await composioClient.connectedAccounts.get({
            connectedAccountId,
        });

        return {
            status: account.status.toLowerCase() as 'pending' | 'completed' | 'failed',
            message: account.statusMessage,
        };
    } catch (error) {
        console.error('[Composio] Failed to check connection:', error);
        throw error;
    }
}

/**
 * Execute a tool action via Composio
 */
export async function executeToolAction(
    toolSlug: string,
    action: string,
    params: Record<string, any>,
    connectedAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!composioClient) {
        // Try to initialize from stored connection
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (!composioConn?.api_key) {
            return { success: false, error: 'No Composio connection configured' };
        }

        initComposio(composioConn.api_key);
    }

    try {
        const result = await composioClient!.actions.execute({
            action: action,
            params: params,
            connectedAccountId: connectedAccountId,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error(`[Composio] Action failed:`, error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get MCP-compatible tool definitions for all enabled tools
 */
export function getMcpToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: any;
}> {
    const tools = getConnectedTools();

    return tools.map((tool: any) => ({
        name: `composio_${tool.tool_slug}`,
        description: `Execute ${tool.tool_name} actions via Composio`,
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', description: 'The action to perform' },
                params: { type: 'object', description: 'Parameters for the action' },
            },
            required: ['action'],
        },
    }));
}

/**
 * Initialize Composio from stored credentials on app start
 */
export function initComposioFromStorage(): boolean {
    try {
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (composioConn?.api_key) {
            initComposio(composioConn.api_key);
            console.log('[Composio] Initialized from stored credentials');
            return true;
        }

        console.log('[Composio] No stored credentials found');
        return false;
    } catch (error) {
        console.error('[Composio] Failed to initialize from storage:', error);
        return false;
    }
}
```

**Step 2: Build and verify**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add claws-desktop/electron/composio-service.ts
git commit -m "feat: Create Composio service layer

Functions implemented:
- initComposio: Initialize client with API key
- listAvailableTools: Discover 500+ available tools
- connectTool: Initiate OAuth flow
- checkConnectionStatus: Verify connection state
- executeToolAction: Run tool actions
- getMcpToolDefinitions: Generate MCP-compatible schemas
- initComposioFromStorage: Auto-restore on app start

Files: electron/composio-service.ts"
```

---

## Task 4: Create MCP Connection Settings UI

**Files:**
- Create: `claws-desktop/src/components/McpSettings.tsx`
- Modify: `claws-desktop/src/components/SettingsPage.tsx`

**Step 1: Create McpSettings component**

```typescript
import React, { useState, useEffect } from 'react';

interface McpConnection {
    id: string;
    name: string;
    type: string;
    api_key: string | null;
    is_enabled: number;
    created_at: number;
}

interface AvailableTool {
    name: string;
    slug: string;
    description: string;
    logo: string;
}

interface McpSettingsProps {
    onClose?: () => void;
}

export const McpSettings: React.FC<McpSettingsProps> = ({ onClose }) => {
    const [connections, setConnections] = useState<McpConnection[]>([]);
    const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newApiKey, setNewApiKey] = useState('');
    const [newConnectionName, setNewConnectionName] = useState('');

    // Load existing connections
    useEffect(() => {
        loadConnections();
    }, []);

    const loadConnections = async () => {
        try {
            const conns = await window.electron.getMcpConnections();
            setConnections(conns || []);
        } catch (err) {
            console.error('Failed to load connections:', err);
            setError('Failed to load connections');
        }
    };

    const handleAddConnection = async () => {
        if (!newApiKey.trim()) {
            setError('API key is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await window.electron.createMcpConnection({
                name: newConnectionName || 'Composio',
                type: 'composio',
                api_key: newApiKey,
            });

            setNewApiKey('');
            setNewConnectionName('');
            setShowAddForm(false);
            await loadConnections();

            // Load available tools after connection
            const tools = await window.electron.listComposioTools(newApiKey);
            setAvailableTools(tools || []);
        } catch (err) {
            console.error('Failed to add connection:', err);
            setError('Failed to add connection. Check your API key.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConnection = async (id: string) => {
        if (!confirm('Delete this connection?')) return;

        try {
            await window.electron.deleteMcpConnection(id);
            await loadConnections();
        } catch (err) {
            console.error('Failed to delete:', err);
            setError('Failed to delete connection');
        }
    };

    const handleToggleConnection = async (id: string, isEnabled: boolean) => {
        try {
            await window.electron.updateMcpConnection(id, { is_enabled: isEnabled ? 1 : 0 });
            await loadConnections();
        } catch (err) {
            console.error('Failed to toggle:', err);
            setError('Failed to update connection');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">MCP Connections</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Connect external services via Composio
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Add Connection
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Add connection form */}
            {showAddForm && (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-4">
                    <h3 className="font-medium text-white">Add Composio Connection</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            type="text"
                            value={newConnectionName}
                            onChange={(e) => setNewConnectionName(e.target.value)}
                            placeholder="My Composio"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">API Key</label>
                        <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="composio-..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Get your API key from <a href="https://app.composio.dev" target="_blank" rel="noopener" className="text-blue-400 hover:underline">app.composio.dev</a>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddConnection}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {loading ? 'Adding...' : 'Add Connection'}
                        </button>
                        <button
                            onClick={() => { setShowAddForm(false); setError(null); }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Connections list */}
            <div className="space-y-3">
                {connections.length === 0 && !showAddForm && (
                    <div className="text-center py-8 text-gray-500">
                        <p>No MCP connections yet</p>
                        <p className="text-sm mt-1">Click "Add Connection" to get started</p>
                    </div>
                )}

                {connections.map((conn) => (
                    <div
                        key={conn.id}
                        className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${conn.is_enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                            <div>
                                <h4 className="font-medium text-white">{conn.name}</h4>
                                <p className="text-xs text-gray-500">{conn.type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleToggleConnection(conn.id, !conn.is_enabled)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    conn.is_enabled
                                        ? 'bg-green-900/50 text-green-400 hover:bg-green-900'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                            >
                                {conn.is_enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <button
                                onClick={() => handleDeleteConnection(conn.id)}
                                className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Available tools (if connection exists) */}
            {availableTools.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-medium text-white mb-3">Available Tools</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {availableTools.slice(0, 10).map((tool) => (
                            <div key={tool.slug} className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {tool.logo && <img src={tool.logo} alt="" className="w-5 h-5 rounded" />}
                                    <span className="text-sm text-white">{tool.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {availableTools.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2">
                            +{availableTools.length - 10} more tools available
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default McpSettings;
```

**Step 2: Modify SettingsPage.tsx to add MCP tab**

Read the current SettingsPage.tsx and add a new tab for MCP connections.

**Step 3: Build and verify**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add claws-desktop/src/components/McpSettings.tsx claws-desktop/src/components/SettingsPage.tsx
git commit -m "feat: Add MCP Connections settings UI

McpSettings component:
- List existing connections
- Add new Composio API key
- Enable/disable connections
- Delete connections
- Show available tools

SettingsPage updated with MCP tab.

Files: src/components/McpSettings.tsx, src/components/SettingsPage.tsx"
```

---

## Task 5: Add IPC Handlers for MCP Operations

**Files:**
- Modify: `claws-desktop/electron/preload.ts`
- Modify: `claws-desktop/electron/main.ts`

**Step 1: Add IPC handlers in main.ts**

Add after existing IPC handlers:

```typescript
// MCP Connection IPC handlers
ipcMain.handle('get-mcp-connections', async () => {
    return getMcpConnections();
});

ipcMain.handle('create-mcp-connection', async (_event, data: { name: string; type: string; api_key: string }) => {
    const id = `mcp-${Date.now()}`;
    createMcpConnection({ id, ...data });
    return { id };
});

ipcMain.handle('update-mcp-connection', async (_event, id: string, updates: { api_key?: string; is_enabled?: number }) => {
    return updateMcpConnection(id, updates);
});

ipcMain.handle('delete-mcp-connection', async (_event, id: string) => {
    return deleteMcpConnection(id);
});

ipcMain.handle('list-composio-tools', async (_event, apiKey: string) => {
    try {
        const { listAvailableTools } = await import('./composio-service.js');
        return await listAvailableTools(apiKey);
    } catch (error) {
        console.error('[IPC] Failed to list tools:', error);
        return [];
    }
});
```

**Step 2: Expose IPC in preload.ts**

Add to the `electron` object in contextBridge.exposeInMainWorld:

```typescript
getMcpConnections: () => ipcRenderer.invoke('get-mcp-connections'),
createMcpConnection: (data: { name: string; type: string; api_key: string }) =>
    ipcRenderer.invoke('create-mcp-connection', data),
updateMcpConnection: (id: string, updates: { api_key?: string; is_enabled?: number }) =>
    ipcRenderer.invoke('update-mcp-connection', id, updates),
deleteMcpConnection: (id: string) =>
    ipcRenderer.invoke('delete-mcp-connection', id),
listComposioTools: (apiKey: string) =>
    ipcRenderer.invoke('list-composio-tools', apiKey),
```

**Step 3: Build and verify**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add claws-desktop/electron/main.ts claws-desktop/electron/preload.ts
git commit -m "feat: Add IPC handlers for MCP connections

Handlers added:
- get-mcp-connections: List all connections
- create-mcp-connection: Store new connection
- update-mcp-connection: Update settings
- delete-mcp-connection: Remove connection
- list-composio-tools: Fetch available tools

Files: electron/main.ts, electron/preload.ts"
```

---

## Task 6: Bridge Composio Tools to MCP Server

**Files:**
- Modify: `claws-desktop/electron/mcp-server.ts:120-238`

**Step 1: Import Composio service at top of mcp-server.ts**

```typescript
import { getMcpToolDefinitions, executeToolAction, initComposioFromStorage } from './composio-service.js';
```

**Step 2: Add Composio initialization in startMcpServer**

After the `mcpServer = new McpServer(...)` line, add:

```typescript
    // Initialize Composio from stored credentials
    initComposioFromStorage();
```

**Step 3: Add Composio tools registration**

After the existing tools in `registerTools`, add:

```typescript
    // Register Composio tools (if configured)
    registerComposioTools(server);
```

**Step 4: Add registerComposioTools function**

Add this function before `registerTools`:

```typescript
/**
 * Register Composio tools as MCP tools.
 * These are dynamic tools based on connected services.
 */
function registerComposioTools(server: McpServer): void {
    try {
        const toolDefs = getMcpToolDefinitions();

        if (toolDefs.length === 0) {
            console.log('[MCP] No Composio tools configured');
            return;
        }

        toolDefs.forEach((def) => {
            server.registerTool(
                def.name,
                {
                    title: def.name,
                    description: def.description,
                    inputSchema: def.inputSchema,
                },
                async (params: { action: string; params?: Record<string, any> }) => {
                    const result = await executeToolAction(
                        def.name.replace('composio_', ''),
                        params.action,
                        params.params || {}
                    );

                    if (result.success) {
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
                        };
                    } else {
                        return {
                            content: [{ type: 'text', text: `Error: ${result.error}` }],
                            isError: true,
                        };
                    }
                }
            );
        });

        console.log(`[MCP] Registered ${toolDefs.length} Composio tools`);
    } catch (error) {
        console.error('[MCP] Failed to register Composio tools:', error);
    }
}
```

**Step 5: Build and verify**

Run:
```bash
cd claws-desktop && npm run build
```

Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add claws-desktop/electron/mcp-server.ts
git commit -m "feat: Bridge Composio tools to MCP server

- Auto-initialize Composio from stored credentials
- Register connected tools as MCP tools
- Dynamic tool registration based on enabled tools
- Proxy tool execution through Composio service

Tools appear as composio_{tool_slug} in MCP.

Files: electron/mcp-server.ts"
```

---

## Task 7: Create Integration Test Script

**Files:**
- Create: `claws-desktop/scripts/test-composio.sh`

**Step 1: Create test script**

```bash
#!/bin/bash
# Test Composio MCP Integration
# Run this after starting the app with: npm run electron:dev

set -e

echo "========================================"
echo "Testing Composio MCP Integration"
echo "========================================"
echo ""

MCP_URL="http://127.0.0.1:3001/mcp"
HEADERS="Content-Type: application/json"

# Test 1: List tools (should include composio_* if configured)
echo "1. Testing list_tools (MCP server running)..."
RESPONSE=$(curl -s -X POST "$MCP_URL" \
    -H "$HEADERS" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

if echo "$RESPONSE" | grep -q '"tools"'; then
    echo "   [PASS] Tools listed"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo "   [FAIL] No tools found"
    echo "$RESPONSE"
fi
echo ""

# Test 2: Check for Composio tools (will only work if connected)
echo "2. Checking for Composio tools..."
if echo "$RESPONSE" | grep -q 'composio_'; then
    echo "   [PASS] Composio tools registered"
    echo "$RESPONSE" | grep -o 'composio_[a-z_]*' | sort -u | head -5
else
    echo "   [SKIP] No Composio tools (not configured yet)"
fi
echo ""

# Test 3: Verify database tables exist
echo "3. Testing database schema..."
DB_PATH="$HOME/Library/Application Support/Claws/claws_memory.db"

if [ -f "$DB_PATH" ]; then
    TABLES=$(sqlite3 "$DB_PATH" ".tables")
    if echo "$TABLES" | grep -q 'mcp_connections'; then
        echo "   [PASS] mcp_connections table exists"
    else
        echo "   [FAIL] mcp_connections table missing"
    fi
    if echo "$TABLES" | grep -q 'connected_tools'; then
        echo "   [PASS] connected_tools table exists"
    else
        echo "   [FAIL] connected_tools table missing"
    fi
else
    echo "   [SKIP] Database not found (app not run yet)"
fi
echo ""

echo "========================================"
echo "Test Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open Settings > MCP in the app"
echo "2. Add your Composio API key"
echo "3. Run this test again to see connected tools"
```

**Step 2: Make script executable**

Run:
```bash
chmod +x claws-desktop/scripts/test-composio.sh
```

**Step 3: Commit**

```bash
git add claws-desktop/scripts/test-composio.sh
git commit -m "feat: Add Composio integration test script

Tests:
- MCP server running and responding
- Composio tools registered (if configured)
- Database tables exist

Usage: ./scripts/test-composio.sh

Files: scripts/test-composio.sh"
```

---

## Task 8: Update Documentation

**Files:**
- Create: `claws-desktop/docs/COMPOSIO-INTEGRATION.md`
- Modify: `docs/plans/providers/FEATURES-ROADMAP.md`

**Step 1: Create Composio integration docs**

```markdown
# Composio Integration Guide

## Overview

Claws Desktop integrates with [Composio](https://composio.dev) to provide access to 500+ pre-built toolkits including:

- **GitHub** - Issues, PRs, repos
- **Slack** - Messages, channels
- **Gmail** - Send/receive emails
- **Google Calendar** - Events, scheduling
- **Notion** - Pages, databases
- **And 500+ more...**

## Setup

### 1. Get Composio API Key

1. Go to [app.composio.dev](https://app.composio.dev)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key

### 2. Add Connection in Claws

1. Open Claws Desktop
2. Go to **Settings** > **MCP**
3. Click **Add Connection**
4. Enter a name (e.g., "My Composio")
5. Paste your API key
6. Click **Add Connection**

### 3. Connect Services

Once connected, you can enable specific tools:

1. Click on your connection
2. Browse available tools
3. Enable the ones you want
4. Complete OAuth for each service

## MCP Access

Composio tools are available via MCP at:

```
http://127.0.0.1:3001/mcp
```

Tools are named: `composio_{service}_{action}`

Example:
- `composio_github_create_issue`
- `composio_slack_send_message`
- `composio_gmail_send_email`

## Testing

Run the test script:

```bash
./scripts/test-composio.sh
```

## Architecture

```
┌─────────────────────┐
│   Claws Desktop     │
│  ┌───────────────┐  │
│  │  MCP Server   │  │
│  │  (port 3001)  │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │  Composio     │  │
│  │  Service      │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
    ┌──────▼──────┐
    │  Composio   │
    │  Cloud API  │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  External   │
    │  Services   │
    │  (GitHub,   │
    │   Slack...) │
    └─────────────┘
```

## Troubleshooting

### "No Composio tools configured"

You need to:
1. Add your API key in Settings > MCP
2. Enable at least one tool

### "API key invalid"

- Check your key at [app.composio.dev](https://app.composio.dev)
- Make sure it's copied correctly (no extra spaces)

### "OAuth failed"

- Check your redirect URL in Composio dashboard
- Should be: `http://localhost:3001/callback`
```

**Step 2: Update FEATURES-ROADMAP.md**

Add new section after Phase 2:

```markdown
---

## Phase 2.5: Composio Integration ✅ (DONE)

### 2.5.1 Core Integration
- [x] Install `@composio/core` and `@composio/mcp`
- [x] Create database tables for MCP connections
- [x] Create Composio service layer
- [x] Add IPC handlers for MCP operations

### 2.5.2 UI & Bridging
- [x] Create MCP Settings component
- [x] Bridge Composio tools to MCP server
- [x] Create integration test script
- [x] Documentation

---
```

**Step 3: Commit**

```bash
git add claws-desktop/docs/COMPOSIO-INTEGRATION.md docs/plans/providers/FEATURES-ROADMAP.md
git commit -m "docs: Add Composio integration documentation

- COMPOSIO-INTEGRATION.md: Setup guide, architecture, troubleshooting
- FEATURES-ROADMAP.md: Added Phase 2.5 section

Files: docs/COMPOSIO-INTEGRATION.md, docs/plans/providers/FEATURES-ROADMAP.md"
```

---

## Task 9: Final Integration Test & Polish

**Step 1: Run full build**

```bash
cd claws-desktop && npm run build
```

Expected: No errors

**Step 2: Start app and verify**

```bash
cd claws-desktop && npm run electron:dev &
sleep 5
./scripts/test-mcp.sh
./scripts/test-composio.sh
```

Expected: All tests pass or skip gracefully

**Step 3: Update root docs**

Add to README.md in claws-desktop:

```markdown
### MCP Integration

Claws exposes an MCP server for external AI tools:

- **URL:** `http://127.0.0.1:3001/mcp`
- **Tools:** read_git_log, read_file, get_memory_stats, run_claude_code
- **Composio:** 500+ additional tools when connected

See [docs/MCP-SETUP.md](docs/MCP-SETUP.md) and [docs/COMPOSIO-INTEGRATION.md](docs/COMPOSIO-INTEGRATION.md).
```

**Step 4: Final commit**

```bash
git add claws-desktop/README.md
git commit -m "docs: Update README with MCP integration info

Added MCP section with endpoint URL and tool list.
Added link to Composio integration docs.

Files: README.md"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Install dependencies | package.json |
| 2 | Database schema | electron/database.ts |
| 3 | Composio service | electron/composio-service.ts |
| 4 | Settings UI | src/components/McpSettings.tsx |
| 5 | IPC handlers | electron/main.ts, preload.ts |
| 6 | MCP bridge | electron/mcp-server.ts |
| 7 | Test script | scripts/test-composio.sh |
| 8 | Documentation | docs/COMPOSIO-INTEGRATION.md |
| 9 | Final test | All files |

## Test Strategy

**Before each commit:**
1. Run `npm run build` - must pass
2. Run relevant test script if available
3. Verify no TypeScript errors

**After all tasks:**
1. Start app with `npm run electron:dev`
2. Run `./scripts/test-mcp.sh`
3. Run `./scripts/test-composio.sh`
4. Add Composio API key in Settings > MCP
5. Verify tools appear in MCP

---

*Plan created: 2026-02-15*
