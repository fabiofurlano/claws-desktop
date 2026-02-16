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

// Auth Config from Composio (user's configured integrations)
export interface AuthConfig {
    id: string;
    toolkitSlug: string;
    toolkitName: string;
    name: string;
    mode: string;
}

// Connection status from OAuth flow
export interface ConnectionStatus {
    status: 'pending' | 'completed' | 'active' | 'failed' | 'inactive';
    message?: string;
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
                listAuthConfigs: () => Promise<AuthConfig[]>;
                // NEW: Tool management
                getConnectedTools: (connectionId?: string) => Promise<ConnectedTool[]>;
                connectTool: (toolSlug: string) => Promise<{ redirectUrl: string | null; connectionId: string }>;
                checkConnectionStatus: (connectionId: string) => Promise<ConnectionStatus>;
                enableTool: (toolId: string) => Promise<unknown>;
                disableTool: (toolId: string) => Promise<unknown>;
                removeTool: (toolId: string) => Promise<unknown>;
            };
            automation: {
                list: () => Promise<unknown[]>;
                create: (task: { name: string; type: 'cron' | 'hook'; trigger: string; action_type: 'prompt' | 'script'; action_data: string; is_active: boolean }) => Promise<string>;
                toggle: (id: string) => Promise<boolean>;
                delete: (id: string) => Promise<void>;
            };
            on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
            send: (channel: string, ...args: unknown[]) => void;
        };
    }
}
