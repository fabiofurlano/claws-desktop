import type { Message as MessageType } from '../types/message';

interface MessageProps {
    message: MessageType;
    mode: 'chat' | 'agent';
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export function Message({ message, mode }: MessageProps) {
    const isUser = message.role === 'user';
    const isChat = mode === 'chat';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
                className={`
          max-w-[75%] px-4 py-3 rounded-2xl
          ${isUser
                        ? isChat
                            ? 'bg-gradient-to-br from-chat-primary to-chat-secondary text-white rounded-br-md shadow-lg shadow-chat-primary/10'
                            : 'bg-gradient-to-br from-agent-primary to-agent-secondary text-white rounded-br-md'
                        : isChat
                            ? 'bg-white text-chat-text rounded-bl-md shadow-sm border border-chat-border'
                            : 'bg-agent-surfaceAlt text-agent-text rounded-bl-md border border-agent-border'
                    }
        `}
            >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                </p>
                <span
                    className={`
            block text-[10px] mt-2 font-mono
            ${isUser
                            ? 'text-white/60'
                            : isChat
                                ? 'text-chat-muted'
                                : 'text-agent-muted'
                        }
          `}
                >
                    {formatTimestamp(message.timestamp)}
                </span>
            </div>
        </div>
    );
}
