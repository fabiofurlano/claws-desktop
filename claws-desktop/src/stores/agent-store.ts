import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Message, NewMessage } from '../types/message';

interface UserProfile {
    name: string;
    preferences: Record<string, unknown>;
    communicationStyle: string;
}

interface Memory {
    userProfile: UserProfile;
    patterns: Array<{
        id: string;
        type: string;
        description: string;
        occurrences: number;
        lastSeen: number;
    }>;
    preferences: Record<string, unknown>;
}

interface AgentState {
    messages: Message[];
    memory: Memory;
    isTyping: boolean;
    isLearning: boolean;
    addMessage: (message: NewMessage) => void;
    clearMessages: () => void;
    updateMemory: (updates: Partial<Memory>) => void;
    setIsTyping: (isTyping: boolean) => void;
    toggleLearning: () => void;
}

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const defaultMemory: Memory = {
    userProfile: {
        name: '',
        preferences: {},
        communicationStyle: 'professional',
    },
    patterns: [],
    preferences: {},
};

export const useAgentStore = create<AgentState>()(
    persist(
        (set) => ({
            messages: [],
            memory: defaultMemory,
            isTyping: false,
            isLearning: true,

            addMessage: (message) => {
                const newMessage: Message = {
                    ...message,
                    id: generateId(),
                    timestamp: Date.now(),
                };

                set((state) => ({
                    messages: [...state.messages, newMessage],
                }));
            },

            clearMessages: () => {
                set({ messages: [] });
            },

            updateMemory: (updates) => {
                set((state) => ({
                    memory: { ...state.memory, ...updates },
                }));
            },

            setIsTyping: (isTyping) => {
                set({ isTyping });
            },

            toggleLearning: () => {
                set((state) => ({ isLearning: !state.isLearning }));
            },
        }),
        {
            name: 'claws-agent',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Selector hooks
export const useAgentMessages = () => useAgentStore((state) => state.messages);
export const useAgentMemory = () => useAgentStore((state) => state.memory);
export const useAgentIsTyping = () => useAgentStore((state) => state.isTyping);
export const useAgentIsLearning = () => useAgentStore((state) => state.isLearning);
export const useAgentActions = () => useAgentStore((state) => ({
    addMessage: state.addMessage,
    clearMessages: state.clearMessages,
    updateMemory: state.updateMemory,
    setIsTyping: state.setIsTyping,
    toggleLearning: state.toggleLearning,
}));
