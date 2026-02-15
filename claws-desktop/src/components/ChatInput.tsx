import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = 'Type a message...', disabled = false }: ChatInputProps) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [value]);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setValue('');
        }
    }, [value, disabled, onSend]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    return (
        <div className="flex items-end gap-3 p-3">
            <div className="flex-1 relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="
            w-full resize-none px-4 py-3 rounded-xl
            bg-transparent
            text-chat-text dark:text-agent-text
            placeholder-chat-muted dark:placeholder-agent-muted
            focus:outline-none
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
                    style={{
                        minHeight: '44px',
                        maxHeight: '120px',
                    }}
                />
            </div>
            <button
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                className={`
          flex-shrink-0 w-11 h-11 rounded-xl
          flex items-center justify-center
          text-white
          transition-all duration-200
          disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none
          ${value.trim() && !disabled
                        ? 'bg-chat-primary dark:bg-agent-primary hover:opacity-90 active:scale-95'
                        : 'bg-chat-muted/30 dark:bg-agent-muted/30'
                    }
        `}
                aria-label="Send message"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </div>
    );
}
