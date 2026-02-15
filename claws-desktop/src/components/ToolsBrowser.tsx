import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ComposioTool, ConnectedTool, McpConnection } from '../types/electron';
import { ToolCard } from './ToolCard';

interface ToolsBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    isAgent: boolean;
    connection: McpConnection;
}

export const ToolsBrowser: React.FC<ToolsBrowserProps> = ({
    isOpen,
    onClose,
    isAgent,
    connection,
}) => {
    const [tools, setTools] = useState<ComposioTool[]>([]);
    const [connectedTools, setConnectedTools] = useState<Map<string, ConnectedTool>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [connectingSlugs, setConnectingSlugs] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        tools.forEach(t => t.categories.forEach(c => cats.add(c)));
        return Array.from(cats).sort();
    }, [tools]);

    // Filter tools by search and category
    const filteredTools = useMemo(() => {
        return tools.filter(tool => {
            const matchesSearch = !searchQuery ||
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !selectedCategory ||
                tool.categories.includes(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [tools, searchQuery, selectedCategory]);

    // Load tools and connected tools
    useEffect(() => {
        if (!isOpen || !connection.api_key) return;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const toolsData = await window.electron.mcp.listTools(connection.api_key!);
                setTools((toolsData || []) as ComposioTool[]);

                const connected = await window.electron.mcp.getConnectedTools(connection.id);
                const map = new Map<string, ConnectedTool>();
                (connected || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
                setConnectedTools(map);
            } catch (err) {
                console.error('Failed to load tools:', err);
                setError('Failed to load tools. Check your connection.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen, connection.id, connection.api_key]);

    // Poll connection status
    const pollConnectionStatus = useCallback(async (connectionId: string, toolSlug: string) => {
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const status = await window.electron.mcp.checkConnectionStatus(connectionId);

            if (status.status === 'active' || status.status === 'completed') {
                const connected = await window.electron.mcp.getConnectedTools(connection.id);
                const map = new Map<string, ConnectedTool>();
                (connected || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
                setConnectedTools(map);
                setConnectingSlugs(prev => {
                    const next = new Set(prev);
                    next.delete(toolSlug);
                    return next;
                });
                return true;
            }

            if (status.status === 'failed') {
                setConnectingSlugs(prev => {
                    const next = new Set(prev);
                    next.delete(toolSlug);
                    return next;
                });
                setError(`Failed to connect ${toolSlug}`);
                return false;
            }
        }

        setConnectingSlugs(prev => {
            const next = new Set(prev);
            next.delete(toolSlug);
            return next;
        });
        setError('Connection timed out');
        return false;
    }, [connection.id]);

    // Handle connect
    const handleConnect = async (tool: ComposioTool) => {
        setConnectingSlugs(prev => new Set(prev).add(tool.slug));
        setError(null);

        try {
            const result = await window.electron.mcp.connectTool(tool.slug);

            if (result.redirectUrl) {
                window.open(result.redirectUrl, '_blank', 'width=600,height=800');
            }

            if (result.connectionId) {
                await pollConnectionStatus(result.connectionId, tool.slug);
            }
        } catch (err) {
            console.error('Failed to connect:', err);
            setError(`Failed to connect ${tool.name}`);
            setConnectingSlugs(prev => {
                const next = new Set(prev);
                next.delete(tool.slug);
                return next;
            });
        }
    };

    // Handle toggle
    const handleToggle = async (tool: ComposioTool, enabled: boolean) => {
        const connected = connectedTools.get(tool.slug);
        if (!connected) return;

        if (enabled) {
            await window.electron.mcp.enableTool(connected.id);
        } else {
            await window.electron.mcp.disableTool(connected.id);
        }

        const connectedData = await window.electron.mcp.getConnectedTools(connection.id);
        const map = new Map<string, ConnectedTool>();
        (connectedData || []).forEach((t: ConnectedTool) => map.set(t.tool_slug, t));
        setConnectedTools(map);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`w-[90vw] max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col ${isAgent
                ? 'bg-agent-surface border border-agent-border'
                : 'bg-white border border-chat-border'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isAgent ? 'border-agent-border' : 'border-chat-border'}`}>
                    <div>
                        <h2 className={`text-lg font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                            Browse Tools
                        </h2>
                        <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            {tools.length} tools available - {connectedTools.size} connected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isAgent
                            ? 'text-agent-muted hover:bg-agent-surfaceAlt hover:text-agent-text'
                            : 'text-chat-muted hover:bg-gray-100 hover:text-chat-text'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search + Filters */}
                <div className={`px-6 py-4 border-b shrink-0 space-y-3 ${isAgent ? 'border-agent-border' : 'border-chat-border'}`}>
                    <div className="relative">
                        <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tools..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border outline-none transition-all ${isAgent
                                ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/50 focus:border-agent-primary'
                                : 'bg-gray-50 border-chat-border text-chat-text placeholder:text-chat-muted/50 focus:border-chat-primary'
                                }`}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedCategory
                                ? isAgent
                                    ? 'bg-agent-primary text-white'
                                    : 'bg-chat-primary text-white'
                                : isAgent
                                    ? 'bg-agent-surfaceAlt text-agent-muted hover:bg-agent-surface'
                                    : 'bg-gray-100 text-chat-muted hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        {categories.slice(0, 10).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat
                                    ? isAgent
                                        ? 'bg-agent-primary text-white'
                                        : 'bg-chat-primary text-white'
                                    : isAgent
                                        ? 'bg-agent-surfaceAlt text-agent-muted hover:bg-agent-surface'
                                        : 'bg-gray-100 text-chat-muted hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg text-sm flex items-center justify-between animate-fade-in shrink-0 ${isAgent
                        ? 'bg-red-900/20 text-red-400 border border-red-800/50'
                        : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">x</button>
                    </div>
                )}

                {/* Tools Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className={`rounded-xl p-4 animate-pulse ${isAgent ? 'bg-agent-surfaceAlt' : 'bg-gray-100'}`}>
                                    <div className={`w-12 h-12 rounded-xl mb-3 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                    <div className={`h-4 rounded mb-2 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                    <div className={`h-3 rounded w-2/3 ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                                </div>
                            ))}
                        </div>
                    ) : filteredTools.length === 0 ? (
                        <div className={`text-center py-12 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            <p className="text-3xl mb-2">Search</p>
                            <p className="font-medium">No tools found</p>
                            <p className="text-sm mt-1">Try a different search or category</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredTools.map(tool => (
                                <ToolCard
                                    key={tool.slug}
                                    tool={tool}
                                    connectedTool={connectedTools.get(tool.slug)}
                                    isConnecting={connectingSlugs.has(tool.slug)}
                                    onConnect={() => handleConnect(tool)}
                                    onToggle={(enabled) => handleToggle(tool, enabled)}
                                    isAgent={isAgent}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-3 border-t shrink-0 ${isAgent ? 'border-agent-border bg-agent-bg/50' : 'border-chat-border bg-gray-50'}`}>
                    <p className={`text-xs text-center ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Discover more at{' '}
                        <a href="https://composio.dev" target="_blank" rel="noopener" className={`underline ${isAgent ? 'text-agent-primary' : 'text-chat-primary'}`}>
                            composio.dev
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ToolsBrowser;
