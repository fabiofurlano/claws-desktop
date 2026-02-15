import { useRef, useEffect } from 'react';
import { useAgentMessages, useAgentIsTyping, useAgentIsLearning, useAgentActions } from '../stores/agent-store';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { MemorySidebar } from './MemorySidebar';

export function AgentMode() {
    const messages = useAgentMessages();
    const isTyping = useAgentIsTyping();
    const isLearning = useAgentIsLearning();
    const { addMessage, setIsTyping, updateMemory } = useAgentActions();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (content: string) => {
        addMessage({ role: 'user', content });
        setIsTyping(true);

        // Simulated AI response (replaced with real provider in Phase 2)
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1500));

        const response = isLearning
            ? `I've processed your message and stored it in my memory. I now have ${messages.length + 1} messages to learn from.`
            : `I received your message. Learning is currently paused, so I won't store this interaction.`;

        addMessage({ role: 'assistant', content: response });

        // Record pattern if learning is on and message is substantial
        if (isLearning && content.length > 10) {
            const currentPatterns = JSON.parse(localStorage.getItem('claws-agent') || '{}');
            const patterns = currentPatterns?.state?.memory?.patterns || [];

            updateMemory({
                patterns: [
                    ...patterns,
                    {
                        id: `pattern-${Date.now()}`,
                        type: 'interaction',
                        description: `User discussed: ${content.slice(0, 50)}...`,
                        occurrences: 1,
                        lastSeen: Date.now(),
                    },
                ],
            });
        }

        setIsTyping(false);
    };

    return (
        <div
            className="flex h-full relative"
            style={{ background: 'var(--gradient-agent)' }}
        >
            {/* Ambient glow effect */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'var(--gradient-agent-glow)' }}
            />

            {/* Main Chat Area */}
            <div className="relative flex-1 flex flex-col">
                {/* Header */}
                <div className="depth-panel flex items-center justify-between px-6 py-4 rounded-none border-x-0 border-t-0">
                    <div>
                        <h2 className="text-lg font-semibold text-agent-text">Agent Mode</h2>
                        <p className="text-sm text-agent-muted">Full power with memory and learning</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-agent-surfaceAlt">
                            <span
                                className={`w-2 h-2 rounded-full ${isLearning ? 'bg-agent-primary' : 'bg-zinc-600'}`}
                                style={isLearning ? { boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' } : {}}
                            />
                            <span className={`text-sm font-medium ${isLearning ? 'text-agent-primary' : 'text-zinc-500'}`}>
                                {isLearning ? 'Learning' : 'Paused'}
                            </span>
                        </div>
                        <div className="text-sm text-agent-muted font-mono">
                            {messages.length} msgs
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-agent-primary/10 rounded-2xl blur-2xl" />
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-agent-primary to-agent-secondary flex items-center justify-center border border-agent-primary/30">
                                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-agent-text mb-2">Agent Ready</h3>
                            <p className="text-sm text-agent-muted max-w-sm leading-relaxed">
                                Agent mode has full memory and learning capabilities. I'll remember our conversations and improve over time.
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
                                    <Message message={message} mode="agent" />
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start mb-4 animate-fade-in">
                                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-agent-surfaceAlt border border-agent-border">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-agent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
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
                    <div className="depth-panel rounded-2xl overflow-hidden">
                        <ChatInput onSend={handleSend} disabled={isTyping} placeholder="Message Agent..." />
                    </div>
                </div>
            </div>

            {/* Memory Sidebar */}
            <MemorySidebar />
        </div>
    );
}
