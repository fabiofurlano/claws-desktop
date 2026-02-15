import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Mode = 'chat' | 'agent';

interface ModeState {
    mode: Mode;
    setMode: (mode: Mode) => void;
    toggleMode: () => void;
}

export const useModeStore = create<ModeState>()(
    persist(
        (set, get) => ({
            mode: 'chat',

            setMode: (mode) => {
                if (get().mode !== mode) {
                    set({ mode });
                }
            },

            toggleMode: () => {
                set((state) => ({
                    mode: state.mode === 'chat' ? 'agent' : 'chat',
                }));
            },
        }),
        {
            name: 'claws-mode',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Selector hooks for optimized re-renders
export const useMode = () => useModeStore((state) => state.mode);
export const useModeActions = () => useModeStore((state) => ({
    setMode: state.setMode,
    toggleMode: state.toggleMode,
}));
