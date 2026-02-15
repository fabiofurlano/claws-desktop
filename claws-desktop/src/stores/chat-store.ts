import { create } from 'zustand';
import type { Message, NewMessage } from '../types/message';

interface ChatState {
    messages: Message[];
    isTyping: boolean;
    addMessage: (message: NewMessage) => void;
    clearMessages: () => void;
    setIsTyping: (isTyping: boolean) => void;
}

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const MAX_MESSAGES = 10;

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isTyping: false,

    addMessage: (message) => {
        const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: Date.now(),
        };

        set((state) => ({
            messages: [...state.messages, newMessage].slice(-MAX_MESSAGES),
        }));
    },

    clearMessages: () => {
        set({ messages: [] });
    },

    setIsTyping: (isTyping) => {
        set({ isTyping });
    },
}));

// Selector hooks
export const useChatMessages = () => useChatStore((state) => state.messages);
export const useChatIsTyping = () => useChatStore((state) => state.isTyping);
export const useChatActions = () => useChatStore((state) => ({
    addMessage: state.addMessage,
    clearMessages: state.clearMessages,
    setIsTyping: state.setIsTyping,
}));
