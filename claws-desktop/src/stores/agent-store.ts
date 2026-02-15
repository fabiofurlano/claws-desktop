import { create } from 'zustand';
import type { Message, NewMessage } from '../types/message';
import { type Skill, skillsManager } from '../utils/skillsManager';

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
    isLoading: boolean;
    activeConversationId: string | null;

    initialize: () => Promise<void>;
    addMessage: (message: NewMessage) => Promise<void>;
    clearMessages: () => void;
    updateMemory: (updates: Partial<Memory>) => void;
    setIsTyping: (isTyping: boolean) => void;
    toggleLearning: () => void;
    skills: Skill[];
    toggleSkill: (id: string) => void;
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

export const useAgentStore = create<AgentState>((set, get) => ({
    messages: [],
    memory: defaultMemory,
    skills: [],
    isTyping: false,
    isLearning: true,
    isLoading: false,
    activeConversationId: null,

    initialize: async () => {
        set({ isLoading: true });
        try {
            // 0. Load Skills
            const initialSkills = skillsManager.getSkills();
            set({ skills: initialSkills });

            // 1. Load or Create Conversation
            const conversations = (await window.electron.db.listConversations('agent')) as any[];
            let conversationId: string;

            if (conversations && conversations.length > 0) {
                // Pick the most recent one
                conversationId = conversations[0].id;
                console.log('Loading existing agent conversation:', conversationId);
            } else {
                // Create new one
                conversationId = generateId();
                await window.electron.db.createConversation(conversationId, 'agent', 'Agent Session');
                console.log('Created new agent conversation:', conversationId);
            }

            set({ activeConversationId: conversationId });

            // 2. Load Messages
            const messages = (await window.electron.db.getMessages(conversationId)) as any[];
            set({ messages: messages || [] });

            // 3. Load Memory
            // Patterns
            const patterns = (await window.electron.db.getPatterns()) as any[];

            // Preferences
            const prefsRaw = (await window.electron.db.getPreferences()) as any[];
            const preferences: Record<string, unknown> = {};
            prefsRaw.forEach((p: any) => {
                preferences[p.key] = p.value;
            });

            // Profile
            const profileRaw = (await window.electron.db.getProfile()) as any[];
            const userProfile = { ...defaultMemory.userProfile };
            profileRaw.forEach((p: any) => {
                // @ts-ignore
                if (p.key in userProfile) userProfile[p.key] = p.value;
            });

            set({
                memory: {
                    userProfile,
                    patterns: patterns || [],
                    preferences,
                }
            });

        } catch (error) {
            console.error('Failed to initialize agent store:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addMessage: async (message) => {
        const { activeConversationId } = get();
        if (!activeConversationId) {
            console.error('No active conversation ID');
            return;
        }

        const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: Date.now(),
        };

        // Optimistic update
        set((state) => ({
            messages: [...state.messages, newMessage],
        }));

        // Persist to DB
        try {
            await window.electron.db.addMessage(
                newMessage.id,
                activeConversationId,
                newMessage.role,
                newMessage.content,
                newMessage.timestamp
            );
        } catch (error) {
            console.error('Failed to save message to DB:', error);
        }
    },

    clearMessages: () => {
        // For now, just clear state. In future, might want to delete from DB or archive.
        set({ messages: [] });
    },

    updateMemory: (updates) => {
        set((state) => ({
            memory: { ...state.memory, ...updates },
        }));

        // Persist updates individually
        // 1. Profile
        if (updates.userProfile) {
            Object.entries(updates.userProfile).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    window.electron.db.setProfileField(key, value);
                }
            });
        }

        // 2. Patterns - usually updated via specialized methods, but handling full overwrite here
        if (updates.patterns) {
            // Re-adding patterns is complex, usually we add one by one. 
            // For now, let's assume this is mostly for UI updates or bulk loads.
            // Best practice: use addPattern explicitly.
            updates.patterns.forEach(p => {
                window.electron.db.addPattern({
                    id: p.id,
                    type: p.type,
                    description: p.description,
                    occurrences: p.occurrences
                });
            });
        }

        // 3. Preferences
        if (updates.preferences) {
            Object.entries(updates.preferences).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    window.electron.db.setPreference(key, value);
                }
            });
        }
    },

    setIsTyping: (isTyping) => {
        set({ isTyping });
    },

    toggleLearning: () => {
        set((state) => ({ isLearning: !state.isLearning }));
    },

    toggleSkill: (id: string) => {
        set((state) => {
            const newSkills = state.skills.map(skill => {
                if (skill.id === id) {
                    const enabled = !skill.isEnabled;
                    // Update manager as well
                    skillsManager.toggleSkill(id, enabled);
                    return { ...skill, isEnabled: enabled };
                }
                return skill;
            });
            return { skills: newSkills };
        });
    },
}));

// Selector hooks
export const useAgentMessages = () => useAgentStore((state) => state.messages);
export const useAgentMemory = () => useAgentStore((state) => state.memory);
export const useAgentIsTyping = () => useAgentStore((state) => state.isTyping);
export const useAgentIsLearning = () => useAgentStore((state) => state.isLearning);
export const useAgentIsLoading = () => useAgentStore((state) => state.isLoading);
export const useAgentActions = () => useAgentStore((state) => ({
    initialize: state.initialize,
    addMessage: state.addMessage,
    clearMessages: state.clearMessages,
    updateMemory: state.updateMemory,
    setIsTyping: state.setIsTyping,
    toggleLearning: state.toggleLearning,
    toggleSkill: state.toggleSkill,
    skills: state.skills,

}));
