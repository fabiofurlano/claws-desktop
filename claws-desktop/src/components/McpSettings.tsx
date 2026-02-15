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

    // Load existing connections on mount
    useEffect(() => {
        loadConnections();
    }, []);

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
            setError('API key is required');
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
            await loadConnections();
        } catch (err) {
            console.error('Failed to add connection:', err);
            setError('Failed to add connection. Check your API key.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConnection = async (id: string) => {
        if (!confirm('Delete this connection?')) return;

        try {
            await window.electron.mcp.deleteConnection(id);
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        MCP Connections
                    </h3>
                    <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Connect external services via Composio
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                        }`}
                >
                    + Add Connection
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className={`p-3 rounded-lg text-sm ${isAgent
                    ? 'bg-red-900/20 border border-red-800 text-red-400'
                    : 'bg-red-50 border border-red-200 text-red-600'
                    }`}>
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">x</button>
                </div>
            )}

            {/* Add connection form */}
            {showAddForm && (
                <div className={`rounded-xl p-4 border space-y-3 ${isAgent
                    ? 'bg-agent-surfaceAlt border-agent-border'
                    : 'bg-gray-50 border-chat-border'
                    }`}>
                    <h4 className={`font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        Add Composio Connection
                    </h4>
                    <div>
                        <label className={`text-xs font-medium ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            Name
                        </label>
                        <input
                            type="text"
                            value={newConnectionName}
                            onChange={(e) => setNewConnectionName(e.target.value)}
                            placeholder="My Composio"
                            className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm border outline-none ${isAgent
                                ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/50 focus:border-agent-primary'
                                : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/50 focus:border-chat-primary'
                                }`}
                        />
                    </div>
                    <div>
                        <label className={`text-xs font-medium ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            API Key
                        </label>
                        <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="composio-..."
                            className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm border outline-none ${isAgent
                                ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/50 focus:border-agent-primary'
                                : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/50 focus:border-chat-primary'
                                }`}
                        />
                        <p className={`text-xs mt-1 ${isAgent ? 'text-agent-muted/70' : 'text-chat-muted/70'}`}>
                            Get your API key from{' '}
                            <a href="https://app.composio.dev" target="_blank" rel="noopener"
                               className={isAgent ? 'text-agent-primary hover:underline' : 'text-chat-primary hover:underline'}>
                                app.composio.dev
                            </a>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddConnection}
                            disabled={loading}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${isAgent
                                ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                                : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                                }`}
                        >
                            {loading ? 'Adding...' : 'Add Connection'}
                        </button>
                        <button
                            onClick={() => { setShowAddForm(false); setError(null); }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAgent
                                ? 'bg-agent-surface text-agent-muted hover:bg-agent-surfaceAlt'
                                : 'bg-gray-100 text-chat-muted hover:bg-gray-200'
                                }`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Connections list */}
            {connections.length === 0 && !showAddForm ? (
                <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isAgent
                    ? 'border-agent-border text-agent-muted'
                    : 'border-chat-border text-chat-muted'
                    }`}>
                    <p className="text-3xl mb-2">~</p>
                    <p className="font-medium">No MCP connections yet</p>
                    <p className="text-sm mt-1">Click "Add Connection" to connect Composio</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className={`flex items-center justify-between p-4 rounded-xl border ${isAgent
                                ? 'bg-agent-surfaceAlt border-agent-border'
                                : 'bg-gray-50 border-chat-border'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${conn.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <div>
                                    <h4 className={`font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                                        {conn.name}
                                    </h4>
                                    <p className={`text-xs ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                                        {conn.type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleConnection(conn.id, !conn.is_enabled)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        conn.is_enabled
                                            ? isAgent
                                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                            : isAgent
                                                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {conn.is_enabled ? 'Enabled' : 'Disabled'}
                                </button>
                                <button
                                    onClick={() => handleDeleteConnection(conn.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        isAgent
                                            ? 'text-red-400 hover:bg-red-900/30'
                                            : 'text-red-500 hover:bg-red-50'
                                    }`}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default McpSettings;
