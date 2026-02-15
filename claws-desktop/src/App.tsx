import { useState, useCallback } from 'react';
import { useMode, useModeActions } from './stores/mode-store';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ChatMode } from './components/ChatMode';
import { AgentMode } from './components/AgentMode';
import { SettingsPage } from './components/SettingsPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
    const mode = useMode();
    const { toggleMode } = useModeActions();
    const [showSettings, setShowSettings] = useState(false);

    const handleToggleMode = useCallback(() => {
        toggleMode();
    }, [toggleMode]);

    const handleToggleSettings = useCallback(() => {
        setShowSettings((prev) => !prev);
    }, []);

    useKeyboardShortcuts({
        'cmd+m': handleToggleMode,
        'cmd+,': handleToggleSettings,
    });

    return (
        <div
            className={`h-screen flex flex-col mode-transition ${mode === 'agent' ? 'dark' : ''}`}
        >
            {/* Title Bar */}
            <header
                className={`
          drag-region flex items-center justify-between px-5 py-3
          border-b transition-colors duration-300
          ${mode === 'chat'
                        ? 'bg-white/90 backdrop-blur-xl border-chat-border'
                        : 'bg-agent-surface border-agent-border'
                    }
        `}
            >
                <div className="flex items-center gap-4 no-drag">
                    {/* Logo */}
                    <div className="relative">
                        <div
                            className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${mode === 'chat'
                                    ? 'bg-gradient-to-br from-chat-primary to-chat-secondary shadow-lg shadow-chat-primary/20'
                                    : 'bg-gradient-to-br from-agent-primary to-agent-secondary'
                                }
              `}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* App Info */}
                    <div>
                        <h1
                            className={`
                text-base font-semibold transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-text' : 'text-agent-text'}
              `}
                        >
                            Claws
                        </h1>
                        <p
                            className={`
                text-xs font-mono transition-colors duration-300
                ${mode === 'chat' ? 'text-chat-muted' : 'text-agent-muted'}
              `}
                        >
                            {mode === 'chat' ? 'chat' : 'agent'} mode • <span className="opacity-60">⌘M</span>
                        </p>
                    </div>
                </div>

                <div className="no-drag flex items-center gap-2">
                    {/* Settings Button */}
                    <button
                        onClick={handleToggleSettings}
                        className={`
                            w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                            ${mode === 'chat'
                                ? 'hover:bg-gray-100 text-chat-muted hover:text-chat-text'
                                : 'hover:bg-agent-surfaceAlt text-agent-muted hover:text-agent-text'
                            }
                        `}
                        title="Settings (⌘,)"
                    >
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    <ModeSwitcher />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {mode === 'chat' ? <ChatMode /> : <AgentMode />}
            </main>

            {/* Settings Modal */}
            {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
        </div>
    );
}
