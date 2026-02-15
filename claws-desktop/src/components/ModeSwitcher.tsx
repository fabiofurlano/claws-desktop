import { useMode, useModeActions } from '../stores/mode-store';

export function ModeSwitcher() {
    const mode = useMode();
    const { toggleMode } = useModeActions();

    return (
        <button
            onClick={toggleMode}
            className={`
        group flex items-center gap-2.5 px-4 py-2 rounded-xl
        font-medium text-sm transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${mode === 'chat'
                    ? 'bg-agent-primary/10 text-agent-primary hover:bg-agent-primary/20 focus:ring-agent-primary'
                    : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20 focus:ring-chat-primary'
                }
      `}
            aria-label={`Switch to ${mode === 'chat' ? 'Agent' : 'Chat'} Mode`}
        >
            {mode === 'chat' ? (
                <>
                    <div className="relative">
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span>Agent Mode</span>
                </>
            ) : (
                <>
                    <div className="relative">
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <span>Chat Mode</span>
                </>
            )}
        </button>
    );
}
