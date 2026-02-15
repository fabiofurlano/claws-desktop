import { useState } from 'react';
import { useProviders, useActiveProviderId, useProviderActions, type ProviderConfig } from '../stores/provider-store';
import { DEFAULT_PROVIDERS, testProviderConnection } from '../utils/aiProvider';
import { useMode } from '../stores/mode-store';

type SettingsTab = 'providers' | 'appearance' | 'data' | 'about';

export function SettingsPage({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
    const mode = useMode();

    const tabs: { id: SettingsTab; label: string; icon: string }[] = [
        { id: 'providers', label: 'Providers', icon: '🔑' },
        { id: 'appearance', label: 'Appearance', icon: '🎨' },
        { id: 'data', label: 'Data', icon: '💾' },
        { id: 'about', label: 'About', icon: 'ℹ️' },
    ];

    const isAgent = mode === 'agent';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className={`w-[700px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isAgent
                    ? 'bg-agent-surface border border-agent-border'
                    : 'bg-white border border-chat-border'
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isAgent ? 'border-agent-border' : 'border-chat-border'
                    }`}>
                    <h2 className={`text-xl font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'
                        }`}>Settings</h2>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isAgent
                            ? 'hover:bg-agent-surfaceAlt text-agent-muted'
                            : 'hover:bg-gray-100 text-chat-muted'
                            }`}
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Tab sidebar */}
                    <div className={`w-44 border-r py-2 ${isAgent ? 'border-agent-border bg-agent-bg/50' : 'border-chat-border bg-gray-50'
                        }`}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors ${activeTab === tab.id
                                    ? isAgent
                                        ? 'bg-agent-primary/10 text-agent-primary font-medium'
                                        : 'bg-chat-primary/10 text-chat-primary font-medium'
                                    : isAgent
                                        ? 'text-agent-muted hover:bg-agent-surfaceAlt'
                                        : 'text-chat-muted hover:bg-gray-100'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'providers' && <ProvidersTab />}
                        {activeTab === 'appearance' && <AppearanceTab />}
                        {activeTab === 'data' && <DataTab />}
                        {activeTab === 'about' && <AboutTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== Providers Tab ====================

function ProvidersTab() {
    const providers = useProviders();
    const activeProviderId = useActiveProviderId();
    const { addProvider, updateProvider, removeProvider, setActiveProvider } = useProviderActions();
    const mode = useMode();
    const isAgent = mode === 'agent';

    const [showAddForm, setShowAddForm] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});

    const handleAddPreset = (preset: keyof typeof DEFAULT_PROVIDERS) => {
        addProvider({ ...DEFAULT_PROVIDERS[preset] });
        setShowAddForm(false);
    };

    const handleTestConnection = async (provider: ProviderConfig) => {
        setTestResults((prev) => ({ ...prev, [provider.id]: 'testing' }));
        const success = await testProviderConnection(provider);
        setTestResults((prev) => ({ ...prev, [provider.id]: success ? 'success' : 'failed' }));
        // Clear result after 3 seconds
        setTimeout(() => {
            setTestResults((prev) => {
                const next = { ...prev };
                delete next[provider.id];
                return next;
            });
        }, 3000);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        AI Providers
                    </h3>
                    <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Configure your AI provider API keys
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAgent
                        ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                        : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                        }`}
                >
                    + Add Provider
                </button>
            </div>

            {/* Add provider form */}
            {showAddForm && (
                <div className={`rounded-xl p-4 border ${isAgent ? 'bg-agent-surfaceAlt border-agent-border' : 'bg-gray-50 border-chat-border'
                    }`}>
                    <p className={`text-sm font-medium mb-3 ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                        Select a provider:
                    </p>
                    <div className="flex gap-2">
                        {(Object.keys(DEFAULT_PROVIDERS) as Array<keyof typeof DEFAULT_PROVIDERS>).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handleAddPreset(preset)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isAgent
                                    ? 'border-agent-border bg-agent-surface text-agent-text hover:border-agent-primary'
                                    : 'border-chat-border bg-white text-chat-text hover:border-chat-primary'
                                    }`}
                            >
                                {DEFAULT_PROVIDERS[preset].name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Provider list */}
            {providers.length === 0 ? (
                <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isAgent ? 'border-agent-border text-agent-muted' : 'border-chat-border text-chat-muted'
                    }`}>
                    <p className="text-3xl mb-2">🔑</p>
                    <p className="font-medium">No providers configured</p>
                    <p className="text-sm mt-1">Add a provider to start chatting with AI</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {providers.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            isActive={provider.id === activeProviderId}
                            testResult={testResults[provider.id]}
                            onUpdate={(updates) => updateProvider(provider.id, updates)}
                            onRemove={() => removeProvider(provider.id)}
                            onSetActive={() => setActiveProvider(provider.id)}
                            onTest={() => handleTestConnection(provider)}
                            isAgent={isAgent}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProviderCard({
    provider,
    isActive,
    testResult,
    onUpdate,
    onRemove,
    onSetActive,
    onTest,
    isAgent,
}: {
    provider: ProviderConfig;
    isActive: boolean;
    testResult?: 'testing' | 'success' | 'failed';
    onUpdate: (updates: Partial<ProviderConfig>) => void;
    onRemove: () => void;
    onSetActive: () => void;
    onTest: () => void;
    isAgent: boolean;
}) {
    const [showApiKey, setShowApiKey] = useState(false);

    return (
        <div className={`rounded-xl border p-4 transition-colors ${isActive
            ? isAgent
                ? 'border-agent-primary/50 bg-agent-primary/5'
                : 'border-chat-primary/50 bg-chat-primary/5'
            : isAgent
                ? 'border-agent-border bg-agent-surfaceAlt'
                : 'border-chat-border bg-gray-50'
            }`}>
            {/* Provider header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{provider.name}</span>
                    {isActive && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAgent ? 'bg-agent-primary/20 text-agent-primary' : 'bg-chat-primary/20 text-chat-primary'
                            }`}>
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isActive && (
                        <button
                            onClick={onSetActive}
                            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${isAgent
                                ? 'text-agent-muted hover:bg-agent-surface'
                                : 'text-chat-muted hover:bg-white'
                                }`}
                        >
                            Set Active
                        </button>
                    )}
                    <button
                        onClick={onRemove}
                        className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        Remove
                    </button>
                </div>
            </div>

            {/* API Key */}
            <div className="space-y-2.5">
                <div>
                    <label className={`text-xs font-medium ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        API Key
                    </label>
                    <div className="flex gap-2 mt-1">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            value={provider.apiKey}
                            onChange={(e) => onUpdate({ apiKey: e.target.value })}
                            placeholder="sk-..."
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none transition-colors ${isAgent
                                ? 'bg-agent-bg border-agent-border text-agent-text placeholder:text-agent-muted/50 focus:border-agent-primary'
                                : 'bg-white border-chat-border text-chat-text placeholder:text-chat-muted/50 focus:border-chat-primary'
                                }`}
                        />
                        <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className={`px-2.5 rounded-lg text-xs border transition-colors ${isAgent
                                ? 'border-agent-border text-agent-muted hover:bg-agent-surface'
                                : 'border-chat-border text-chat-muted hover:bg-white'
                                }`}
                        >
                            {showApiKey ? '🔒' : '👁️'}
                        </button>
                    </div>
                </div>

                {/* Model */}
                <div>
                    <label className={`text-xs font-medium ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Model
                    </label>
                    <input
                        type="text"
                        value={provider.model}
                        onChange={(e) => onUpdate({ model: e.target.value })}
                        className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm border outline-none transition-colors ${isAgent
                            ? 'bg-agent-bg border-agent-border text-agent-text focus:border-agent-primary'
                            : 'bg-white border-chat-border text-chat-text focus:border-chat-primary'
                            }`}
                    />
                </div>

                {/* Base URL */}
                <div>
                    <label className={`text-xs font-medium ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                        Base URL
                    </label>
                    <input
                        type="text"
                        value={provider.baseUrl}
                        onChange={(e) => onUpdate({ baseUrl: e.target.value })}
                        className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm border outline-none transition-colors font-mono ${isAgent
                            ? 'bg-agent-bg border-agent-border text-agent-text focus:border-agent-primary'
                            : 'bg-white border-chat-border text-chat-text focus:border-chat-primary'
                            }`}
                    />
                </div>

                {/* Test Connection button */}
                <div className="flex items-center gap-3 pt-1">
                    <button
                        onClick={onTest}
                        disabled={!provider.apiKey || testResult === 'testing'}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${isAgent
                            ? 'bg-agent-primary/20 text-agent-primary hover:bg-agent-primary/30'
                            : 'bg-chat-primary/10 text-chat-primary hover:bg-chat-primary/20'
                            }`}
                    >
                        {testResult === 'testing' ? '⏳ Testing...' : '🔌 Test Connection'}
                    </button>
                    {testResult === 'success' && (
                        <span className="text-sm text-green-500 font-medium animate-fade-in">✅ Connected!</span>
                    )}
                    {testResult === 'failed' && (
                        <span className="text-sm text-red-400 font-medium animate-fade-in">❌ Failed</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== Appearance Tab ====================

function AppearanceTab() {
    const mode = useMode();
    const isAgent = mode === 'agent';
    return (
        <div className="space-y-4">
            <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                Appearance
            </h3>
            <div className={`rounded-xl border p-4 ${isAgent ? 'border-agent-border bg-agent-surfaceAlt' : 'border-chat-border bg-gray-50'
                }`}>
                <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                    Theme settings will be available in a future update. The app currently follows your system theme.
                </p>
            </div>
        </div>
    );
}

// ==================== Data Tab ====================

function DataTab() {
    const mode = useMode();
    const isAgent = mode === 'agent';
    return (
        <div className="space-y-4">
            <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                Data & Privacy
            </h3>
            <div className={`rounded-xl border p-4 space-y-3 ${isAgent ? 'border-agent-border bg-agent-surfaceAlt' : 'border-chat-border bg-gray-50'
                }`}>
                <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                    All your data is stored locally on your machine. Nothing is sent to external servers except your messages to the AI provider you configure.
                </p>
                <div className={`text-xs space-y-1 ${isAgent ? 'text-agent-muted/70' : 'text-chat-muted/70'}`}>
                    <p>• Chat mode messages are never saved</p>
                    <p>• Agent mode memory is stored in SQLite</p>
                    <p>• API keys are stored in local storage</p>
                </div>
            </div>
        </div>
    );
}

// ==================== About Tab ====================

function AboutTab() {
    const mode = useMode();
    const isAgent = mode === 'agent';
    return (
        <div className="space-y-4">
            <h3 className={`text-base font-semibold ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                About Claws
            </h3>
            <div className={`rounded-xl border p-5 ${isAgent ? 'border-agent-border bg-agent-surfaceAlt' : 'border-chat-border bg-gray-50'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl">⚡</span>
                    </div>
                    <div>
                        <p className={`font-semibold text-lg ${isAgent ? 'text-agent-text' : 'text-chat-text'}`}>
                            Claws Desktop
                        </p>
                        <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                            v0.1.0 — Personal AI Assistant
                        </p>
                    </div>
                </div>
                <div className={`text-sm space-y-2 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                    <p>Two modes for different needs:</p>
                    <p>• <strong>Chat Mode:</strong> Quick, private conversations</p>
                    <p>• <strong>Agent Mode:</strong> Full memory and learning</p>
                    <p className="pt-2">Open source • MIT License</p>
                </div>
            </div>
        </div>
    );
}
