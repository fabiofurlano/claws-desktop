import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    initDatabase, closeDatabase,
    createConversation, getConversation, listConversations, deleteConversation,
    addMessageToDb, getMessages,
    addPattern, getPatterns,
    setPreference, getPreferences,
    setProfileField, getProfile,
    getMemoryStats,
} from './database.js';

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
    // Initialize SQLite database
    initDatabase();

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

app.on('before-quit', () => {
    closeDatabase();
});

// IPC handlers — App info
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
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
