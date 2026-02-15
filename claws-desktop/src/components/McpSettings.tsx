import React, { useState, useEffect } from 'react';
import type { McpConnection } from '../types/electron';

interface McpSettingsProps {
    isAgent: boolean;
}

export const McpSettings: React.FC<McpSettingsProps> = ({ isAgent }) => {
    const [connections, setConnections] = useState<McpConnection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newApiKey, setNewApiKey] = useState('');
    const [newConnectionName, setNewConnectionName] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load existing connections on mount
    useEffect(() => {
        loadConnections();
    }, []);

    // Auto-hide success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadConnections = async () => {
        try {
            const conns = await window.electron.mcp.getConnections();
            setConnections(conns || []);
        } catch (err) {
            console.error('Failed to load connections:', err);
            setError('Failed to load connections');
        }
    };

    const handleAddConnection = async () => {
        if (!newApiKey.trim()) {
            setError('Please enter your API key');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await window.electron.mcp.createConnection({
                name: newConnectionName || 'Composio',
                type: 'composio',
                api_key: newApiKey,
            });

            setNewApiKey('');
            setNewConnectionName('');
            setShowAddForm(false);
            setSuccessMessage('Connection added successfully!');
            await loadConnections();
        } catch (err) {
            console.error('Failed to add connection:', err);
            setError('Failed to add connection. Please check your API key.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConnection = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

        try {
            await window.electron.mcp.deleteConnection(id);
            setSuccessMessage('Connection deleted');
            await loadConnections();
        } catch (err) {
            console.error('Failed to delete:', err);
            setError('Failed to delete connection');
        }
    };

    const handleToggleConnection = async (id: string, isEnabled: boolean) => {
        try {
            await window.electron.mcp.updateConnection(id, { is_enabled: isEnabled ? 1 : 0 });
            await loadConnections();
        } catch (err) {
            console.error('Failed to toggle:', err);
            setError('Failed to update connection');
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        MCP Connections
                    </h3>
                    <p className={`text-sm mt-0.5 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Connect 250+ services through Composio
                    </p>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${isAgent
                            ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30 active:scale-95'
                            : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20 active:scale-95'
                            }`}
                    >
                        + Add Connection
                    </button>
                )}
            </div>

            {/* Success message */}
            {successMessage && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in ${isAgent
                    ? 'bg-green-900/20 border border-green-800/50 text-green-400'
                    : 'bg-green-50 border border-green-200 text-green-600'
                    }`}>
                    <span className="text-base">✓</span>
                    {successMessage}
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className={`p-3 rounded-lg text-sm flex items-center justify-between animate-fade-in ${isAgent
                    ? 'bg-red-900/20 border border-red-800/50 text-red-400'
                    : 'bg-red-50 border border-red-200 text-red-600'
                    }`}>
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="opacity-60 hover:opacity-100 transition-opacity px-1"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Add connection form */}
            {showAddForm && (
                <div className={`rounded-xl p-5 border animate-fade-in ${isAgent
                    ? 'bg-agent-surfaceAlt border-agent-border'
                    : 'bg-gray-50 border-chat-border'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className={`font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                            New Connection
                        </h4>
                        <button
                            onClick={() => { setShowAddForm(false); setError(null); }}
                            className={`p-1.5 rounded-lg transition-colors ${isAgent
                                ? 'text-agent-muted hover:bg-agent-surface hover:text-agent-text'
                                : 'text-chat-muted hover:bg-gray-100 hover:text-chat-text'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wide ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={newConnectionName}
                                onChange={(e) => setNewConnectionName(e.target.value)}
                                placeholder="My Composio"
                                className={`w-full mt-1.5 px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-200 ${isAgent
                                    ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/40 focus:border-agent-primary focus:ring-1 focus:ring-agent-primary/30'
                                    : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/40 focus:border-chat-primary focus:ring-1 focus:ring-chat-primary/20'
                                    }`}
                            />
                        </div>

                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wide ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                                API Key <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="password"
                                value={newApiKey}
                                onChange={(e) => setNewApiKey(e.target.value)}
                                placeholder="composio_..."
                                autoFocus
                                className={`w-full mt-1.5 px-3 py-2 rounded-lg text-sm border outline-none font-mono transition-all duration-200 ${isAgent
                                    ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/40 focus:border-agent-primary focus:ring-1 focus:ring-agent-primary/30'
                                    : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/40 focus:border-chat-primary focus:ring-1 focus:ring-chat-primary/20'
                                    }`}
                            />
                            <p className={`text-xs mt-2 flex items-center gap-1.5 ${isAgent ? 'text-agent-muted/80' : 'text-chat-muted/80'}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Get your key at{' '}
                                <a
                                    href="https://app.composio.dev"
                                    target="_blank"
                                    rel="noopener"
                                    className={`underline underline-offset-2 ${isAgent ? 'text-agent-primary hover:text-agent-primary/80' : 'text-chat-primary hover:text-chat-primary/80'}`}
                                >
                                    app.composio.dev
                                </a>
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleAddConnection}
                                disabled={loading || !newApiKey.trim()}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${isAgent
                                    ? 'bg-agent-primary text-white hover:bg-agent-primary/90 active:scale-[0.98]'
                                    : 'bg-chat-primary text-white hover:bg-chat-primary/90 active:scale-[0.98]'
                                    }`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Adding...
                                    </span>
                                ) : 'Add Connection'}
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setError(null); setNewApiKey(''); setNewConnectionName(''); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isAgent
                                    ? 'text-agent-muted hover:bg-agent-surface hover:text-agent-text'
                                    : 'text-chat-muted hover:bg-white hover:text-chat-text'
                                    }`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connections list */}
            {connections.length === 0 && !showAddForm ? (
                <div className={`text-center py-12 rounded-xl border-2 border-dashed transition-colors ${isAgent
                    ? 'border-agent-border/50 hover:border-agent-border text-agent-muted'
                    : 'border-chat-border/50 hover:border-chat-border text-chat-muted'
                    }`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isAgent ? 'bg-agent-surfaceAlt' : 'bg-gray-100'}`}>
                        <svg className={`w-8 h-8 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <p className={`font-medium text-base ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        No connections yet
                    </p>
                    <p className="text-sm mt-1 max-w-xs mx-auto">
                        Connect Composio to access 250+ tools like GitHub, Slack, Gmail, and more
                    </p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isAgent
                            ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                            : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                            }`}
                    >
                        Add your first connection
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isAgent
                                ? 'bg-agent-surfaceAlt border-agent-border hover:border-agent-primary/30'
                                : 'bg-gray-50 border-chat-border hover:border-chat-primary/30'
                                }`}
                        >
                            <div className="flex items-center gap-3.5">
                                {/* Status indicator with pulse animation */}
                                <div className="relative">
                                    <div className={`w-2.5 h-2.5 rounded-full ${conn.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {conn.is_enabled && (
                                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-30" />
                                    )}
                                </div>
                                <div>
                                    <h4 className={`font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                                        {conn.name}
                                    </h4>
                                    <p className={`text-xs flex items-center gap-1.5 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${isAgent
                                            ? 'bg-agent-primary/10 text-agent-primary'
                                            : 'bg-chat-primary/10 text-chat-primary'
                                            }`}>
                                            {conn.type}
                                        </span>
                                        {conn.is_enabled && (
                                            <span className="text-green-500">● Active</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleConnection(conn.id, !conn.is_enabled)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                        conn.is_enabled
                                            ? isAgent
                                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                            : isAgent
                                                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {conn.is_enabled ? '● On' : '○ Off'}
                                </button>
                                <button
                                    onClick={() => handleDeleteConnection(conn.id, conn.name)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isAgent
                                            ? 'text-red-400/60 hover:text-red-400 hover:bg-red-900/20'
                                            : 'text-red-400/60 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                    title="Delete connection"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info box */}
            {!showAddForm && connections.length > 0 && (
                <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${isAgent
                    ? 'bg-agent-surface text-agent-muted/80 border border-agent-border/50'
                    : 'bg-gray-50 text-chat-muted/80 border border-chat-border/50'
                    }`}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        Connected services are available via MCP at <code className={`px-1 py-0.5 rounded text-[10px] ${isAgent ? 'bg-agent-bg' : 'bg-white'}`}>http://127.0.0.1:3001/mcp</code>
                    </span>
                </div>
            )}
        </div>
    );
};

export default McpSettings;
