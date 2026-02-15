import { useRef, useEffect } from 'react';
import { useChatMessages, useChatIsTyping, useChatActions } from '../stores/chat-store';
import { Message } from './Message';
import { ChatInput } from './ChatInput';

export function ChatMode() {
    const messages = useChatMessages();
    const isTyping = useChatIsTyping();
    const { addMessage, setIsTyping } = useChatActions();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (content: string) => {
        addMessage({ role: 'user', content });
        setIsTyping(true);

        // Simulated AI response (replaced with real provider in Phase 2)
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        addMessage({
            role: 'assistant',
            content: `I received your message: "${content}". Chat mode is active — no memory is being stored.`,
        });
        setIsTyping(false);
    };

    return (
        <div
            className="flex flex-col h-full"
            style={{ background: 'var(--gradient-chat)' }}
        >
            {/* Header */}
            <div className="glass-panel flex items-center justify-between px-6 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-chat-text">Chat Mode</h2>
                    <p className="text-sm text-chat-muted">No memory, quick conversations</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chat-primary/10">
                    <span className="w-2 h-2 rounded-full bg-chat-primary animate-pulse" />
                    <span className="text-sm font-medium text-chat-primary">Active</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-chat-primary/20 rounded-2xl blur-xl" />
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-chat-primary to-chat-secondary flex items-center justify-center shadow-glow-chat">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-chat-text mb-2">Start a conversation</h3>
                        <p className="text-sm text-chat-muted max-w-sm leading-relaxed">
                            Chat mode is lightweight and private. Your messages stay here and aren't stored after you close the app.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
                                className="animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <Message message={message} mode="chat" />
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start mb-4 animate-fade-in">
                                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white shadow-sm border border-chat-border">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-chat-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="px-4 pb-4">
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <ChatInput onSend={handleSend} disabled={isTyping} />
                </div>
            </div>
        </div>
    );
}
