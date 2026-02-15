import React from 'react';
import type { ComposioTool, ConnectedTool } from '../types/electron';

interface ToolCardProps {
    tool: ComposioTool;
    connectedTool?: ConnectedTool;
    isConnecting: boolean;
    onConnect: () => void;
    onToggle: (enabled: boolean) => void;
    isAgent: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({
    tool,
    connectedTool,
    isConnecting,
    onConnect,
    onToggle,
    isAgent,
}) => {
    const isConnected = !!connectedTool;
    const isEnabled = connectedTool?.is_enabled === 1;

    return (
        <div className={`group rounded-xl border p-4 transition-all duration-200 ${isAgent
            ? 'bg-agent-surfaceAlt border-agent-border hover:border-agent-primary/40'
            : 'bg-white border-chat-border hover:border-chat-primary/40'
            }`}>
            {/* Logo + Name */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isAgent ? 'bg-agent-surface' : 'bg-gray-100'}`}>
                    {tool.logo ? (
                        <img src={tool.logo} alt={tool.name} className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                        <span className="text-xl">🔧</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold truncate ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        {tool.name}
                    </h4>
                    <p className={`text-xs line-clamp-2 mt-0.5 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        {tool.description}
                    </p>
                </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 mb-3">
                {tool.categories.slice(0, 3).map((cat) => (
                    <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full ${isAgent
                        ? 'bg-agent-primary/10 text-agent-primary'
                        : 'bg-chat-primary/10 text-chat-primary'
                        }`}>
                        {cat}
                    </span>
                ))}
            </div>

            {/* Action Button */}
            {isConnecting ? (
                <button disabled className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${isAgent
                    ? 'bg-agent-surface text-agent-muted'
                    : 'bg-gray-100 text-chat-muted'
                    }`}>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                </button>
            ) : isConnected ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => onToggle(!isEnabled)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            isEnabled
                                ? isAgent
                                    ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                                    : 'bg-green-100 text-green-600 border border-green-200'
                                : isAgent
                                    ? 'bg-gray-700 text-gray-400'
                                    : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        {isEnabled ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                On
                            </span>
                        ) : '○ Off'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={onConnect}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30 active:scale-[0.98]'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20 active:scale-[0.98]'
                        }`}
                >
                    + Connect
                </button>
            )}
        </div>
    );
};

export default ToolCard;
