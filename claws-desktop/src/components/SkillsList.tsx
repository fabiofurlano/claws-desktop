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

export const SkillsList: React.FC = () => {
    const skills = useAgentStore((state) => state.skills) as LocalSkill[];
    const toggleSkill = useAgentStore((state) => state.toggleSkill);
    const [showBrowser, setShowBrowser] = useState(false);

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

    // Handle skill installed from browser
    const handleSkillInstalled = (skill: UnifiedSkill) => {
        console.log('Skill installed:', skill.name);
    };

    return (
        <div className="flex flex-col gap-2 p-2">
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
            ))}

            <SkillsBrowser
                isOpen={showBrowser}
                onClose={() => setShowBrowser(false)}
                onInstall={handleSkillInstalled}
            />
        </div>
    );
};
