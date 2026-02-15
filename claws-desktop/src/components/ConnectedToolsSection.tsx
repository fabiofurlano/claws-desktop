import React, { useState, useEffect } from 'react';
import type { ConnectedTool, McpConnection } from '../types/electron';

interface ConnectedToolsSectionProps {
    isAgent: boolean;
    connection: McpConnection;
    onBrowseTools: () => void;
}

export const ConnectedToolsSection: React.FC<ConnectedToolsSectionProps> = ({
    isAgent,
    connection,
    onBrowseTools,
}) => {
    const [tools, setTools] = useState<ConnectedTool[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTools();
    }, [connection.id]);

    const loadTools = async () => {
        setLoading(true);
        try {
            const data = await window.electron.mcp.getConnectedTools(connection.id);
            setTools(data || []);
        } catch (err) {
            console.error('Failed to load connected tools:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (tool: ConnectedTool, enabled: boolean) => {
        if (enabled) {
            await window.electron.mcp.enableTool(tool.id);
        } else {
            await window.electron.mcp.disableTool(tool.id);
        }
        await loadTools();
    };

    const handleRemove = async (tool: ConnectedTool) => {
        if (!confirm(`Remove "${tool.tool_name}"?`)) return;
        await window.electron.mcp.removeTool(tool.id);
        await loadTools();
    };

    // Helper to check if tool is enabled (handles number 0/1 from SQLite)
    const isToolEnabled = (tool: ConnectedTool): boolean => tool.is_enabled === 1;

    if (loading) {
        return (
            <div className={`p-4 rounded-xl ${isAgent ? 'bg-agent-surfaceAlt' : 'bg-gray-50'}`}>
                <div className="animate-pulse flex gap-2">
                    <div className={`h-6 w-20 rounded ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                    <div className={`h-6 w-20 rounded ${isAgent ? 'bg-agent-surface' : 'bg-gray-200'}`} />
                </div>
            </div>
        );
    }

    if (tools.length === 0) {
        return (
            <div className={`p-4 rounded-xl border-2 border-dashed text-center ${isAgent
                ? 'border-agent-border text-agent-muted'
                : 'border-chat-border text-chat-muted'
                }`}>
                <p className="text-sm">No tools connected yet</p>
                <button
                    onClick={onBrowseTools}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                        }`}
                >
                    Browse Tools
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                    Connected Tools ({tools.length})
                </h4>
                <button
                    onClick={onBrowseTools}
                    className={`text-xs font-medium transition-colors ${isAgent
                        ? 'text-agent-primary hover:text-agent-primary/80'
                        : 'text-chat-primary hover:text-chat-primary/80'
                        }`}
                >
                    + Add More
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {tools.map(tool => {
                    const enabled = isToolEnabled(tool);
                    return (
                        <div
                            key={tool.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isAgent
                                ? 'bg-agent-surfaceAlt border border-agent-border'
                                : 'bg-gray-50 border border-chat-border'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className={isAgent ? 'text-agent-text' : 'text-chat-text'}>
                                {tool.tool_name}
                            </span>
                            <button
                                onClick={() => handleToggle(tool, !enabled)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                    enabled
                                        ? isAgent
                                            ? 'text-green-400 hover:bg-green-900/20'
                                            : 'text-green-600 hover:bg-green-100'
                                        : isAgent
                                            ? 'text-agent-muted hover:bg-agent-surface'
                                            : 'text-chat-muted hover:bg-white'
                                }`}
                            >
                                {enabled ? 'On' : 'Off'}
                            </button>
                            <button
                                onClick={() => handleRemove(tool)}
                                className={`text-xs opacity-50 hover:opacity-100 transition-opacity ${isAgent
                                    ? 'text-red-400'
                                    : 'text-red-500'
                                    }`}
                            >
                                x
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConnectedToolsSection;
