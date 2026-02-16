import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

/**
 * Get the database file path.
 * Stored in the user's app data directory:
 * macOS: ~/Library/Application Support/Claws/claws_memory.db
 * Windows: %APPDATA%/Claws/claws_memory.db
 */
function getDbPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'claws_memory.db');
}

/**
 * Initialize the SQLite database and create tables if they don't exist.
 * Called once on app startup from main.ts.
 */
export function initDatabase(): Database.Database {
    if (db) return db;

    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create all tables in a transaction
    db.exec(`
        -- Conversations table
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL CHECK(mode IN ('chat', 'agent')),
            title TEXT,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        -- Messages within conversations
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        -- Memory patterns (agent mode learning)
        CREATE TABLE IF NOT EXISTS patterns (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            occurrences INTEGER NOT NULL DEFAULT 1,
            last_seen INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        -- User preferences (agent mode learning)
        CREATE TABLE IF NOT EXISTS preferences (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            confidence REAL NOT NULL DEFAULT 0.5,
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        -- User profile (agent mode memory)
        CREATE TABLE IF NOT EXISTS user_profile (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        -- Skills (built-in and user-added)
        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            config TEXT,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        -- Provider configs (backup to SQLite, primary in localStorage for renderer)
        CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            model TEXT NOT NULL,
            base_url TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

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

        -- Indices for fast lookups
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
        CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
        CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

        -- Automation Tasks (scheduled tasks and event hooks)
        CREATE TABLE IF NOT EXISTS automation_tasks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('cron', 'hook')),
            trigger TEXT NOT NULL,
            action_type TEXT NOT NULL CHECK(action_type IN ('prompt', 'script')),
            action_data TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            last_run INTEGER
        );

        -- Automation execution logs
        CREATE TABLE IF NOT EXISTS automation_logs (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            run_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            status TEXT NOT NULL,
            output TEXT,
            FOREIGN KEY (task_id) REFERENCES automation_tasks(id) ON DELETE CASCADE
        );

        -- Index for fast tool lookup
        CREATE INDEX IF NOT EXISTS idx_connected_tools_connection ON connected_tools(connection_id);
        CREATE INDEX IF NOT EXISTS idx_connected_tools_enabled ON connected_tools(is_enabled);

        -- Index for automation lookups
        CREATE INDEX IF NOT EXISTS idx_automation_tasks_type ON automation_tasks(type);
        CREATE INDEX IF NOT EXISTS idx_automation_tasks_active ON automation_tasks(is_active);
        CREATE INDEX IF NOT EXISTS idx_automation_logs_task ON automation_logs(task_id);
    `);

    return db;
}

/**
 * Get the database instance. Must call initDatabase() first.
 */
export function getDatabase(): Database.Database {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

/**
 * Close the database connection gracefully.
 * Called on app quit.
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

// ==================== CONVERSATIONS ====================

export function createConversation(id: string, mode: string, title?: string) {
    const stmt = getDatabase().prepare(
        'INSERT INTO conversations (id, mode, title) VALUES (?, ?, ?)'
    );
    return stmt.run(id, mode, title || null);
}

export function getConversation(id: string) {
    return getDatabase().prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

export function listConversations(mode?: string) {
    if (mode) {
        return getDatabase()
            .prepare('SELECT * FROM conversations WHERE mode = ? ORDER BY updated_at DESC')
            .all(mode);
    }
    return getDatabase()
        .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
        .all();
}

export function deleteConversation(id: string) {
    return getDatabase().prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

// ==================== MESSAGES ====================

export function addMessageToDb(
    id: string,
    conversationId: string,
    role: string,
    content: string,
    timestamp: number
) {
    const db = getDatabase();
    const insertMsg = db.prepare(
        'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    const updateConv = db.prepare(
        'UPDATE conversations SET updated_at = ? WHERE id = ?'
    );
    const transaction = db.transaction(() => {
        insertMsg.run(id, conversationId, role, content, timestamp);
        updateConv.run(timestamp, conversationId);
    });
    return transaction();
}

export function getMessages(conversationId: string) {
    return getDatabase()
        .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC')
        .all(conversationId);
}

// ==================== PATTERNS ====================

export function addPattern(pattern: {
    id: string;
    type: string;
    description: string;
    occurrences?: number;
}) {
    return getDatabase()
        .prepare(
            'INSERT OR REPLACE INTO patterns (id, type, description, occurrences, last_seen) VALUES (?, ?, ?, ?, ?)'
        )
        .run(pattern.id, pattern.type, pattern.description, pattern.occurrences || 1, Date.now());
}

export function getPatterns() {
    return getDatabase()
        .prepare('SELECT * FROM patterns ORDER BY last_seen DESC')
        .all();
}

// ==================== PREFERENCES ====================

export function setPreference(key: string, value: string, confidence?: number) {
    return getDatabase()
        .prepare(
            'INSERT OR REPLACE INTO preferences (id, key, value, confidence, updated_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(`pref-${key}`, key, value, confidence || 0.5, Date.now());
}

export function getPreferences() {
    return getDatabase().prepare('SELECT * FROM preferences ORDER BY key').all();
}

// ==================== USER PROFILE ====================

export function setProfileField(key: string, value: string) {
    return getDatabase()
        .prepare(
            'INSERT OR REPLACE INTO user_profile (key, value, updated_at) VALUES (?, ?, ?)'
        )
        .run(key, value, Date.now());
}

export function getProfile() {
    return getDatabase().prepare('SELECT * FROM user_profile').all();
}

// ==================== STATS ====================

export function getMemoryStats() {
    const db = getDatabase();
    const patterns = db.prepare('SELECT COUNT(*) as count FROM patterns').get() as { count: number };
    const preferences = db.prepare('SELECT COUNT(*) as count FROM preferences').get() as { count: number };
    const conversations = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
    const messages = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
    return {
        patterns: patterns.count,
        preferences: preferences.count,
        conversations: conversations.count,
        messages: messages.count,
    };
}

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

// ==================== AUTOMATION TASKS ====================

export interface AutomationTask {
    id: string;
    name: string;
    type: 'cron' | 'hook';
    trigger: string;
    action_type: 'prompt' | 'script';
    action_data: string;
    is_active: number;
    created_at: number;
    last_run: number | null;
}

export function createAutomationTask(task: {
    id: string;
    name: string;
    type: 'cron' | 'hook';
    trigger: string;
    action_type: 'prompt' | 'script';
    action_data: string;
    is_active?: boolean;
}) {
    return getDatabase()
        .prepare(
            'INSERT INTO automation_tasks (id, name, type, trigger, action_type, action_data, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(task.id, task.name, task.type, task.trigger, task.action_type, task.action_data, task.is_active ? 1 : 0);
}

export function getAutomationTasks() {
    return getDatabase()
        .prepare('SELECT * FROM automation_tasks ORDER BY created_at DESC')
        .all() as AutomationTask[];
}

export function getAutomationTask(id: string) {
    return getDatabase()
        .prepare('SELECT * FROM automation_tasks WHERE id = ?')
        .get(id) as AutomationTask | undefined;
}

export function getActiveAutomationTasks() {
    return getDatabase()
        .prepare('SELECT * FROM automation_tasks WHERE is_active = 1')
        .all() as AutomationTask[];
}

export function toggleAutomationTask(id: string, is_active: boolean) {
    return getDatabase()
        .prepare('UPDATE automation_tasks SET is_active = ? WHERE id = ?')
        .run(is_active ? 1 : 0, id);
}

export function updateAutomationTaskLastRun(id: string) {
    return getDatabase()
        .prepare('UPDATE automation_tasks SET last_run = ? WHERE id = ?')
        .run(Date.now(), id);
}

export function deleteAutomationTask(id: string) {
    return getDatabase()
        .prepare('DELETE FROM automation_tasks WHERE id = ?')
        .run(id);
}

// ==================== AUTOMATION LOGS ====================

export interface AutomationLog {
    id: string;
    task_id: string;
    run_at: number;
    status: 'success' | 'error';
    output: string | null;
}

export function createAutomationLog(log: {
    id: string;
    task_id: string;
    status: 'success' | 'error';
    output?: string;
}) {
    return getDatabase()
        .prepare(
            'INSERT INTO automation_logs (id, task_id, run_at, status, output) VALUES (?, ?, ?, ?, ?)'
        )
        .run(log.id, log.task_id, Date.now(), log.status, log.output || null);
}

export function getAutomationLogs(taskId?: string) {
    if (taskId) {
        return getDatabase()
            .prepare('SELECT * FROM automation_logs WHERE task_id = ? ORDER BY run_at DESC LIMIT 100')
            .all(taskId) as AutomationLog[];
    }
    return getDatabase()
        .prepare('SELECT * FROM automation_logs ORDER BY run_at DESC LIMIT 100')
        .all() as AutomationLog[];
}
