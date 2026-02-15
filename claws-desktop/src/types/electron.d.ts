export { };

declare global {
    interface Window {
        electron: {
            getAppVersion: () => Promise<string>;
            getPlatform: () => Promise<string>;
            getTheme: () => Promise<'dark' | 'light'>;
            onThemeChange: (callback: (theme: 'dark' | 'light') => void) => () => void;
            db: {
                createConversation: (id: string, mode: string, title?: string) => Promise<unknown>;
                getConversation: (id: string) => Promise<unknown>;
                listConversations: (mode?: string) => Promise<unknown[]>;
                deleteConversation: (id: string) => Promise<unknown>;
                addMessage: (id: string, conversationId: string, role: string, content: string, timestamp: number) => Promise<unknown>;
                getMessages: (conversationId: string) => Promise<unknown[]>;
                addPattern: (pattern: { id: string; type: string; description: string; occurrences?: number }) => Promise<unknown>;
                getPatterns: () => Promise<unknown[]>;
                setPreference: (key: string, value: string, confidence?: number) => Promise<unknown>;
                getPreferences: () => Promise<unknown[]>;
                setProfileField: (key: string, value: string) => Promise<unknown>;
                getProfile: () => Promise<unknown[]>;
                getMemoryStats: () => Promise<{ patterns: number; preferences: number; conversations: number; messages: number }>;
            };
        };
    }
}
