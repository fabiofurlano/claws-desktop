import { useCallback } from 'react';
import { useMode, useModeActions } from './stores/mode-store';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ChatMode } from './components/ChatMode';
import { AgentMode } from './components/AgentMode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
    const mode = useMode();
    const { toggleMode } = useModeActions();

    const handleToggleMode = useCallback(() => {
        toggleMode();
    }, [toggleMode]);

    useKeyboardShortcuts({
        'cmd+m': handleToggleMode,
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

                <div className="no-drag">
                    <ModeSwitcher />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {mode === 'chat' ? <ChatMode /> : <AgentMode />}
            </main>
        </div>
    );
}
