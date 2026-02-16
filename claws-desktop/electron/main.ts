import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import {
    initDatabase, closeDatabase,
    createConversation, getConversation, listConversations, deleteConversation,
    addMessageToDb, getMessages,
    addPattern, getPatterns,
    setPreference, getPreferences,
    setProfileField, getProfile,
    getMemoryStats,
    createMcpConnection, getMcpConnections, updateMcpConnection, deleteMcpConnection,
    getConnectedTools, addConnectedTool, toggleConnectedTool, removeConnectedTool,
} from './database';
import {
    listInstalledSkills,
    installSkill,
    uninstallSkill,
    searchSkills,
} from './skills-registry';
import { startMcpServer, stopMcpServer } from './mcp-server.js';
import { initAutomation, createTask, listTasks, toggleTask, deleteTask, triggerEvent, stopAllJobs } from './automation';

// In CommonJS, __dirname is automatically available

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
app.whenReady().then(async () => {
    // Initialize SQLite database
    initDatabase();

    // Initialize automation system (cron scheduler and hooks)
    initAutomation();

    // Start MCP server for OpenClaw connection
    try {
        await startMcpServer();
    } catch (error) {
        console.error('[Main] Failed to start MCP server:', error);
    }

    createWindow();

    // Trigger app:startup event after window is ready
    setTimeout(() => triggerEvent('app:startup'), 1000);

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

app.on('before-quit', async () => {
    stopAllJobs();
    await stopMcpServer();
    closeDatabase();
});

// IPC handlers — App info
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

// IPC handlers — AI
import { streamThinking } from './ai-service';

ipcMain.handle('ai:streamCompletion', (event, request) => {
    const requestId = Math.random().toString(36).substring(7);

    streamThinking(
        request,
        (chunk) => {
            if (!mainWindow) return;
            mainWindow.webContents.send('ai:chunk', requestId, chunk);
        },
        () => {
            if (!mainWindow) return;
            mainWindow.webContents.send('ai:done', requestId);
        },
        (error) => {
            if (!mainWindow) return;
            mainWindow.webContents.send('ai:error', requestId, error);
        }
    );

    return requestId;
});

// IPC handlers — Database: Conversations
ipcMain.handle('db:createConversation', (_event, id: string, mode: string, title?: string) => {
    return createConversation(id, mode, title);
});
ipcMain.handle('db:getConversation', (_event, id: string) => {
    return getConversation(id);
});
ipcMain.handle('db:listConversations', (_event, mode?: string) => {
    return listConversations(mode);
});
ipcMain.handle('db:deleteConversation', (_event, id: string) => {
    return deleteConversation(id);
});

// IPC handlers — Database: Messages
ipcMain.handle('db:addMessage', (_event, id: string, conversationId: string, role: string, content: string, timestamp: number) => {
    return addMessageToDb(id, conversationId, role, content, timestamp);
});
ipcMain.handle('db:getMessages', (_event, conversationId: string) => {
    return getMessages(conversationId);
});

// IPC handlers — Database: Memory (Patterns, Preferences, Profile)
ipcMain.handle('db:addPattern', (_event, pattern: { id: string; type: string; description: string; occurrences?: number }) => {
    return addPattern(pattern);
});
ipcMain.handle('db:getPatterns', () => {
    return getPatterns();
});
ipcMain.handle('db:setPreference', (_event, key: string, value: string, confidence?: number) => {
    return setPreference(key, value, confidence);
});
ipcMain.handle('db:getPreferences', () => {
    return getPreferences();
});
ipcMain.handle('db:setProfileField', (_event, key: string, value: string) => {
    return setProfileField(key, value);
});
ipcMain.handle('db:getProfile', () => {
    return getProfile();
});
ipcMain.handle('db:getMemoryStats', () => {
    return getMemoryStats();
});

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

// IPC handlers — MCP Connections
ipcMain.handle('mcp:getConnections', async () => {
    return getMcpConnections();
});

ipcMain.handle('mcp:createConnection', async (_event, data: { name: string; type: string; api_key: string }) => {
    const id = `mcp-${Date.now()}`;
    createMcpConnection({ id, ...data });
    return { id };
});

ipcMain.handle('mcp:updateConnection', async (_event, id: string, updates: { api_key?: string; is_enabled?: number }) => {
    return updateMcpConnection(id, updates);
});

ipcMain.handle('mcp:deleteConnection', async (_event, id: string) => {
    return deleteMcpConnection(id);
});

ipcMain.handle('mcp:listTools', async (_event, apiKey: string) => {
    try {
        const { listAvailableTools } = await import('./composio-service.js');
        return await listAvailableTools(apiKey);
    } catch (error) {
        console.error('[IPC] Failed to list tools:', error);
        return [];
    }
});

// List auth configs - shows what integrations user has configured in Composio
ipcMain.handle('mcp:listAuthConfigs', async () => {
    try {
        const { listAuthConfigs } = await import('./composio-service.js');
        return await listAuthConfigs();
    } catch (error) {
        console.error('[IPC] Failed to list auth configs:', error);
        return [];
    }
});

// IPC handlers — Connected Tools
// Get connected tools from database
ipcMain.handle('mcp:getConnectedTools', async (_event, connectionId?: string) => {
    return getConnectedTools(connectionId);
});

// Connect a tool (initiate OAuth)
ipcMain.handle('mcp:connectTool', async (_event, toolSlug: string) => {
    console.log(`[IPC] mcp:connectTool called with toolSlug: ${toolSlug}`);

    try {
        const { connectTool, getToolkitDetails, listAuthConfigs } = await import('./composio-service.js');

        // Get active Composio connection
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (!composioConn) {
            console.error('[IPC] No active Composio connection found');
            throw new Error('No active Composio connection');
        }

        console.log(`[IPC] Using connection: ${composioConn.id}`);

        // Get toolkit details to find authConfigId
        console.log(`[IPC] Getting toolkit details for: ${toolSlug}`);
        const toolkit = await getToolkitDetails(toolSlug);
        console.log(`[IPC] Toolkit authConfigDetails:`, toolkit.authConfigDetails);

        const authConfig = toolkit.authConfigDetails?.[0];

        if (!authConfig?.id) {
            // Get all auth configs to show user what's available
            console.log(`[IPC] No auth config found, listing all available...`);
            const allConfigs = await listAuthConfigs();
            const availableToolkits = [...new Set(allConfigs.map(c => c.toolkitSlug))].join(', ');

            console.error(`[IPC] Available toolkits: ${availableToolkits}`);
            throw new Error(
                `No auth config found for "${toolSlug}". ` +
                `You need to create an auth config in Composio dashboard first. ` +
                `Available toolkits with configs: ${availableToolkits || 'none'}`
            );
        }

        console.log(`[IPC] Found auth config: ${authConfig.id} (${authConfig.name}) for ${toolSlug}`);

        // Initiate connection
        console.log(`[IPC] Creating connection link...`);
        const result = await connectTool('default-user', authConfig.id);
        console.log(`[IPC] Connection created:`, result);

        // Store pending connection in database
        const toolId = `tool-${Date.now()}`;
        addConnectedTool({
            id: toolId,
            connection_id: composioConn.id,
            tool_name: toolkit.name,
            tool_slug: toolSlug,
            config: JSON.stringify({ pendingConnectionId: result.connectionId }),
        });

        console.log(`[IPC] Tool stored in database with id: ${toolId}`);

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

// IPC handlers — Automation
ipcMain.handle('automation:list', async () => {
    return listTasks();
});

ipcMain.handle('automation:create', async (_event, task: any) => {
    return createTask(task);
});

ipcMain.handle('automation:toggle', async (_event, id: string) => {
    return toggleTask(id);
});

ipcMain.handle('automation:delete', async (_event, id: string) => {
    return deleteTask(id);
});

// Listen for open-automation-dashboard event
ipcMain.on('open-automation-dashboard', () => {
    mainWindow?.webContents.send('show-automation-dashboard');
});
