import React, { useState } from 'react';
import { useAgentStore } from '../stores/agent-store';
import { SkillsBrowser } from './SkillsBrowser';
import type { Skill as UnifiedSkill } from '../types/skill';

// Local interface matching current skillsManager.Skill structure
interface LocalSkill {
    id: string;
    name: string;
    description: string;
    source?: 'builtin' | 'vercel' | 'local';
    isEnabled: boolean;
}

// Simple toast notification state
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export const SkillsList: React.FC = () => {
    const skills = useAgentStore((state) => state.skills) as LocalSkill[];
    const toggleSkill = useAgentStore((state) => state.toggleSkill);
    const uninstallSkill = useAgentStore((state) => state.uninstallSkill);
    const [showBrowser, setShowBrowser] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Show toast notification
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Get source badge color
    const getSourceBadge = (source?: string) => {
        switch (source) {
            case 'vercel':
                return 'bg-purple-600/20 text-purple-400';
            case 'builtin':
                return 'bg-blue-600/20 text-blue-400';
            default:
                return 'bg-gray-600/20 text-gray-400';
        }
    };

    // Handle skill installed from browser - add to store
    const handleSkillInstalled = (skill: UnifiedSkill) => {
        console.log('Skill installed:', skill.name);
        showToast(`"${skill.name}" installed successfully!`, 'success');
        // Add the skill to the store if not already there
        const exists = skills.some(s => s.id === skill.id);
        if (!exists) {
            // Force a re-read of skills from the backend
            window.electron.skills.list().then((installedSkills) => {
                // Find the newly installed skill and add it
                const newSkill = installedSkills.find(s => s.id === skill.id);
                if (newSkill) {
                    useAgentStore.setState(state => ({
                        skills: [...state.skills.filter(s => s.id !== skill.id), newSkill]
                    }));
                }
            });
        }
    };

    // Handle skill uninstall
    const handleUninstall = async (skillId: string, skillName: string) => {
        if (!confirm(`Remove "${skillName}"? This cannot be undone.`)) {
            return;
        }

        setDeletingId(skillId);
        showToast(`Removing "${skillName}"...`, 'info');

        try {
            await uninstallSkill(skillId);
            showToast(`"${skillName}" removed successfully!`, 'success');
        } catch (error) {
            console.error('Failed to uninstall skill:', error);
            showToast(`Failed to remove "${skillName}"`, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-2 relative">
            {/* Toast notifications */}
            <div className="absolute top-0 right-0 z-50 flex flex-col gap-1 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            px-3 py-2 rounded-lg text-xs font-medium shadow-lg animate-fade-in
                            pointer-events-auto
                            ${toast.type === 'success' ? 'bg-green-600 text-white' :
                              toast.type === 'error' ? 'bg-red-600 text-white' :
                              'bg-gray-700 text-gray-200'}
                        `}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Capabilities
                </h3>
                <button
                    onClick={() => setShowBrowser(true)}
                    className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                    title="Browse and install skills from skills.sh"
                >
                    + Add Skill
                </button>
            </div>

            {skills.length === 0 && (
                <div className="text-xs text-gray-500 italic">No skills loaded</div>
            )}

            {skills.map((skill) => (
                <div
                    key={skill.id}
                    className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1 mr-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200 truncate" title={skill.name}>
                                {skill.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getSourceBadge(skill.source)}`}>
                                {skill.source || 'builtin'}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate" title={skill.description}>
                            {skill.description}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Uninstall button - only for non-builtin skills */}
                        {skill.source !== 'builtin' && (
                            <button
                                onClick={() => handleUninstall(skill.id, skill.name)}
                                disabled={deletingId === skill.id}
                                className="text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors p-1"
                                title="Remove skill"
                            >
                                {deletingId === skill.id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                            </button>
                        )}

                        {/* Toggle switch */}
                        <button
                            onClick={() => toggleSkill(skill.id)}
                            className={`
                                relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                                ${skill.isEnabled ? 'bg-blue-600' : 'bg-gray-600'}
                            `}
                            role="switch"
                            aria-checked={skill.isEnabled}
                        >
                            <span className="sr-only">Enable {skill.name}</span>
                            <span
                                className={`
                                    inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                                    ${skill.isEnabled ? 'translate-x-5' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>
                </div>
            ))}

            <SkillsBrowser
                isOpen={showBrowser}
                onClose={() => setShowBrowser(false)}
                onInstall={handleSkillInstalled}
            />
        </div>
    );
};
