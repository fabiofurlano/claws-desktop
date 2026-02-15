export { };

// MCP Connection type
export interface McpConnection {
    id: string;
    name: string;
    type: string;
    api_key: string | null;
    is_enabled: number;
    config: string | null;
    created_at: number;
    last_used: number | null;
}

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
            ai: {
                streamCompletion: (request: { apiKey: string; baseUrl: string; model: string; messages: unknown[] }) => Promise<string>;
                onChunk: (callback: (requestId: string, chunk: string) => void) => () => void;
                onDone: (callback: (requestId: string) => void) => () => void;
                onError: (callback: (requestId: string, error: string) => void) => () => void;
            };
            skills: {
                list: () => Promise<import('../types/skill').Skill[]>;
                install: (skillId: string) => Promise<import('../types/skill').SkillInstallResult>;
                uninstall: (skillId: string) => Promise<{ success: boolean; error?: string }>;
                search: (query?: string) => Promise<import('../types/skill').SkillMetadata[]>;
            };
            mcp: {
                getConnections: () => Promise<McpConnection[]>;
                createConnection: (data: { name: string; type: string; api_key: string }) => Promise<{ id: string }>;
                updateConnection: (id: string, updates: { api_key?: string; is_enabled?: number }) => Promise<unknown>;
                deleteConnection: (id: string) => Promise<unknown>;
                listTools: (apiKey: string) => Promise<unknown[]>;
            };
        };
    }
}
