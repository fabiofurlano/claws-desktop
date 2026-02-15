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
