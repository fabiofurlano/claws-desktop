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

        -- Indices for fast lookups
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
        CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
        CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);
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
