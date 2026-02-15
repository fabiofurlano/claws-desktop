import { useState } from 'react';
import { useAgentMemory, useAgentActions } from '../stores/agent-store';
import { useProviderActions, useProviders, type ProviderConfig } from '../stores/provider-store';
import { useSkills, useSkillActions } from '../stores/skill-store';
import { DEFAULT_PROVIDERS, testProviderConnection } from '../utils/aiProvider';

// Steps in the wizard
type Step = 'welcome' | 'provider' | 'profile' | 'skills' | 'ready';

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<Step>('welcome');

    // Provider state
    const providers = useProviders();
    const { addProvider, updateProvider } = useProviderActions();
    const [apiKey, setApiKey] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<keyof typeof DEFAULT_PROVIDERS | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'failed'>('none');

    // Profile state
    const memory = useAgentMemory();
    const { updateMemory } = useAgentActions();
    const [name, setName] = useState(memory.userProfile.name || '');

    // Skills state
    const skills = useSkills();
    const { toggleSkill } = useSkillActions();

    // Handlers
    const handleProviderSetup = async () => {
        if (!selectedPreset) return;

        // Cast to ProviderConfig to satisfy type checker, ID is dummy
        const providerConfig = {
            ...DEFAULT_PROVIDERS[selectedPreset],
            apiKey,
            id: 'temp-setup-id'
        } as ProviderConfig;

        setIsTestingConnection(true);
        const success = await testProviderConnection(providerConfig);
        setIsTestingConnection(false);

        if (success) {
            setConnectionStatus('success');
            // Check if provider already exists by name/model
            const existing = providers.find(p => p.name === providerConfig.name);
            if (existing) {
                updateProvider(existing.id, { apiKey });
            } else {
                // Remove the dummy ID before adding, let store generate it
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...configWithoutId } = providerConfig;
                addProvider(configWithoutId);
            }

            setTimeout(() => setStep('profile'), 1000);
        } else {
            setConnectionStatus('failed');
        }
    };

    const handleProfileSubmit = () => {
        if (!name.trim()) return;
        updateMemory({
            userProfile: {
                ...memory.userProfile,
                name: name.trim(),
            }
        });
        setStep('skills');
    };

    const handleFinish = () => {
        // Mark as completed in local storage
        localStorage.setItem('claws_onboarding_completed', 'true');
        onComplete();
    };


    // Render steps
    const renderWelcome = () => (
        <div className="text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-4xl">⚡</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Claws</h1>
                <p className="text-gray-400 text-lg max-w-md mx-auto">
                    Your personal AI assistant with memory, learning, and local skills.
                </p>
            </div>
            <button
                onClick={() => setStep('provider')}
                className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-transform"
            >
                Get Started
            </button>
        </div>
    );

    const renderProvider = () => (
        <div className="space-y-6 w-full max-w-md animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Connect Intelligence</h2>
                <p className="text-gray-400">To think, I need a brain. Connect an AI provider.</p>
            </div>

            <div className="space-y-4">
                {/* Presets */}
                <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(DEFAULT_PROVIDERS) as Array<keyof typeof DEFAULT_PROVIDERS>).map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                setSelectedPreset(key);
                                setConnectionStatus('none');
                                setApiKey('');
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${selectedPreset === key
                                    ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                    : 'bg-zinc-800/50 border-zinc-700 text-gray-400 hover:bg-zinc-800'
                                }`}
                        >
                            <div className="font-semibold text-sm">{DEFAULT_PROVIDERS[key].name}</div>
                        </button>
                    ))}
                </div>

                {/* API Key Input */}
                {selectedPreset && (
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-medium text-gray-400 ml-1">API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={`sk-... for ${DEFAULT_PROVIDERS[selectedPreset].name}`}
                                className="w-full mt-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                            />
                        </div>

                        <button
                            onClick={handleProviderSetup}
                            disabled={!apiKey || isTestingConnection}
                            className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${connectionStatus === 'success'
                                    ? 'bg-green-500 text-white'
                                    : connectionStatus === 'failed'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white text-black hover:bg-gray-100'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isTestingConnection ? (
                                'Connecting...'
                            ) : connectionStatus === 'success' ? (
                                'Connected! 🎉'
                            ) : connectionStatus === 'failed' ? (
                                'Connection Failed'
                            ) : (
                                'Connect Provider'
                            )}
                        </button>

                        {connectionStatus === 'failed' && (
                            <p className="text-xs text-red-400 text-center">
                                Invalid API key or network error. Please check and try again.
                            </p>
                        )}
                    </div>
                )}

                <button
                    onClick={() => setStep('profile')}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 mt-4"
                >
                    Skip for now (I'll configure later)
                </button>
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="space-y-6 w-full max-w-md text-center animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Identity</h2>
                <p className="text-gray-400">What should I call you?</p>
            </div>

            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full text-center px-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleProfileSubmit()}
            />

            <button
                onClick={handleProfileSubmit}
                disabled={!name.trim()}
                className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
                Continue
            </button>
        </div>
    );

    const renderSkills = () => (
        <div className="space-y-6 w-full max-w-md animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Capabilities</h2>
                <p className="text-gray-400">Select skills to enable initially.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {skills.map((skill) => (
                    <button
                        key={skill.id}
                        onClick={() => toggleSkill(skill.id)}
                        className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${skill.isEnabled
                                ? 'bg-blue-500/10 border-blue-500/50'
                                : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-500'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{skill.icon}</span>
                            <div>
                                <h3 className={`font-semibold ${skill.isEnabled ? 'text-white' : 'text-gray-400'}`}>
                                    {skill.name}
                                </h3>
                                <p className="text-xs text-gray-500 line-clamp-1">{skill.description}</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${skill.isEnabled ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                            }`}>
                            {skill.isEnabled && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={() => setStep('ready')}
                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-transform"
            >
                Continue
            </button>
        </div>
    );

    const renderReady = () => (
        <div className="text-center space-y-8 animate-fade-in">
            <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-white mb-2">All Set!</h1>
                <p className="text-gray-400 text-lg">
                    I'm ready to help you with your tasks.
                </p>
            </div>

            <button
                onClick={handleFinish}
                className="px-10 py-4 bg-white text-black font-bold text-lg rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-white/10"
            >
                Launch Claws
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
                {step === 'welcome' && renderWelcome()}
                {step === 'provider' && renderProvider()}
                {step === 'profile' && renderProfile()}
                {step === 'skills' && renderSkills()}
                {step === 'ready' && renderReady()}

                {/* Progress dots */}
                {step !== 'welcome' && step !== 'ready' && (
                    <div className="flex gap-2 mt-8">
                        {['provider', 'profile', 'skills'].map((s) => (
                            <div
                                key={s}
                                className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-white' : 'bg-zinc-800'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
