import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProviderConfig {
    id: string;
    name: string;
    apiKey: string;
    model: string;
    baseUrl: string;
    isActive: boolean;
}

interface ProviderState {
    providers: ProviderConfig[];
    activeProviderId: string | null;
    addProvider: (provider: Omit<ProviderConfig, 'id'>) => void;
    updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
    removeProvider: (id: string) => void;
    setActiveProvider: (id: string) => void;
    getActiveProvider: () => ProviderConfig | null;
}

const generateId = (): string => `provider-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

// Migration: Fix old provider configs (wrong OpenRouter baseUrl, Z.AI model case)
const PROVIDER_STORE_VERSION = 2;

const migrateProviderStore = (persistedState: unknown, _version: number): unknown => {
    if (!persistedState || typeof persistedState !== 'object') return persistedState;
    const state = persistedState as { providers?: ProviderConfig[] };
    if (!state.providers) return persistedState;

    const providers = state.providers.map((p) => {
        // Fix OpenRouter baseUrl (was sometimes wrong domain)
        if (p.name?.toLowerCase().includes('openrouter') && p.baseUrl) {
            if (!p.baseUrl.includes('openrouter.ai')) {
                p.baseUrl = 'https://openrouter.ai/api/v1';
            }
        }
        // Fix Z.AI model case sensitivity (must be lowercase)
        if (p.baseUrl?.includes('api.z.ai') && p.model) {
            p.model = p.model.toLowerCase();
        }
        return p;
    });

    return { ...state, providers };
};

export const useProviderStore = create<ProviderState>()(
    persist(
        (set, get) => ({
            providers: [],
            activeProviderId: null,

            addProvider: (provider) => {
                const newProvider: ProviderConfig = {
                    ...provider,
                    id: generateId(),
                };
                set((state) => ({
                    providers: [...state.providers, newProvider],
                    // Auto-activate if first provider
                    activeProviderId: state.activeProviderId ?? newProvider.id,
                }));
            },

            updateProvider: (id, updates) => {
                set((state) => ({
                    providers: state.providers.map((p) =>
                        p.id === id ? { ...p, ...updates } : p
                    ),
                }));
            },

            removeProvider: (id) => {
                set((state) => {
                    const remaining = state.providers.filter((p) => p.id !== id);
                    return {
                        providers: remaining,
                        activeProviderId:
                            state.activeProviderId === id
                                ? remaining[0]?.id ?? null
                                : state.activeProviderId,
                    };
                });
            },

            setActiveProvider: (id) => {
                set({ activeProviderId: id });
            },

            getActiveProvider: () => {
                const { providers, activeProviderId } = get();
                return providers.find((p) => p.id === activeProviderId) ?? null;
            },
        }),
        {
            name: 'claws-providers',
            version: PROVIDER_STORE_VERSION,
            storage: createJSONStorage(() => localStorage),
            migrate: migrateProviderStore,
        }
    )
);

// Selector hooks
export const useProviders = () => useProviderStore((state) => state.providers);
export const useActiveProviderId = () => useProviderStore((state) => state.activeProviderId);
export const useProviderActions = () => useProviderStore((state) => ({
    addProvider: state.addProvider,
    updateProvider: state.updateProvider,
    removeProvider: state.removeProvider,
    setActiveProvider: state.setActiveProvider,
    getActiveProvider: state.getActiveProvider,
}));
