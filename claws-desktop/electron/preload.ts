import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    getTheme: () => Promise<'dark' | 'light'>;
    onThemeChange: (callback: (theme: 'dark' | 'light') => void) => () => void;

    // Database: Conversations
    db: {
        createConversation: (id: string, mode: string, title?: string) => Promise<unknown>;
        getConversation: (id: string) => Promise<unknown>;
        listConversations: (mode?: string) => Promise<unknown[]>;
        deleteConversation: (id: string) => Promise<unknown>;

        // Messages
        addMessage: (id: string, conversationId: string, role: string, content: string, timestamp: number) => Promise<unknown>;
        getMessages: (conversationId: string) => Promise<unknown[]>;

        // Memory
        addPattern: (pattern: { id: string; type: string; description: string; occurrences?: number }) => Promise<unknown>;
        getPatterns: () => Promise<unknown[]>;
        setPreference: (key: string, value: string, confidence?: number) => Promise<unknown>;
        getPreferences: () => Promise<unknown[]>;
        setProfileField: (key: string, value: string) => Promise<unknown>;
        getProfile: () => Promise<unknown[]>;
        getMemoryStats: () => Promise<{ patterns: number; preferences: number; conversations: number; messages: number }>;
    };

    // AI
    ai: {
        streamCompletion: (request: { apiKey: string; baseUrl: string; model: string; messages: unknown[] }) => Promise<string>;
        onChunk: (callback: (requestId: string, chunk: string) => void) => () => void;
        onDone: (callback: (requestId: string) => void) => () => void;
        onError: (callback: (requestId: string, error: string) => void) => () => void;
    };

    // Skills
    skills: {
        list: () => Promise<import('../src/types/skill').Skill[]>;
        install: (skillId: string) => Promise<import('../src/types/skill').SkillInstallResult>;
        uninstall: (skillId: string) => Promise<{ success: boolean; error?: string }>;
        search: (query?: string) => Promise<import('../src/types/skill').SkillMetadata[]>;
    };
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

    db: {
        createConversation: (id, mode, title?) => ipcRenderer.invoke('db:createConversation', id, mode, title),
        getConversation: (id) => ipcRenderer.invoke('db:getConversation', id),
        listConversations: (mode?) => ipcRenderer.invoke('db:listConversations', mode),
        deleteConversation: (id) => ipcRenderer.invoke('db:deleteConversation', id),

        addMessage: (id, conversationId, role, content, timestamp) =>
            ipcRenderer.invoke('db:addMessage', id, conversationId, role, content, timestamp),
        getMessages: (conversationId) => ipcRenderer.invoke('db:getMessages', conversationId),

        addPattern: (pattern) => ipcRenderer.invoke('db:addPattern', pattern),
        getPatterns: () => ipcRenderer.invoke('db:getPatterns'),
        setPreference: (key, value, confidence?) => ipcRenderer.invoke('db:setPreference', key, value, confidence),
        getPreferences: () => ipcRenderer.invoke('db:getPreferences'),
        setProfileField: (key, value) => ipcRenderer.invoke('db:setProfileField', key, value),
        getProfile: () => ipcRenderer.invoke('db:getProfile'),
        getMemoryStats: () => ipcRenderer.invoke('db:getMemoryStats'),
    },

    // AI
    ai: {
        streamCompletion: (request: { apiKey: string; baseUrl: string; model: string; messages: unknown[] }) =>
            ipcRenderer.invoke('ai:streamCompletion', request),
        onChunk: (callback: (requestId: string, chunk: string) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, requestId: string, chunk: string) => callback(requestId, chunk);
            ipcRenderer.on('ai:chunk', handler);
            return () => ipcRenderer.removeListener('ai:chunk', handler);
        },
        onDone: (callback: (requestId: string) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, requestId: string) => callback(requestId);
            ipcRenderer.on('ai:done', handler);
            return () => ipcRenderer.removeListener('ai:done', handler);
        },
        onError: (callback: (requestId: string, error: string) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, requestId: string, error: string) => callback(requestId, error);
            ipcRenderer.on('ai:error', handler);
            return () => ipcRenderer.removeListener('ai:error', handler);
        },
    },

    // Skills
    skills: {
        list: () => ipcRenderer.invoke('skills:list'),
        install: (skillId: string) => ipcRenderer.invoke('skills:install', skillId),
        uninstall: (skillId: string) => ipcRenderer.invoke('skills:uninstall', skillId),
        search: (query?: string) => ipcRenderer.invoke('skills:search', query),
    },
};

// Expose to renderer
contextBridge.exposeInMainWorld('electron', electronAPI);
