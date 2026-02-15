import React from 'react';
import { useAgentStore } from '../stores/agent-store';

export const SkillsList: React.FC = () => {
    const skills = useAgentStore((state) => state.skills);
    const toggleSkill = useAgentStore((state) => state.toggleSkill);

    return (
        <div className="flex flex-col gap-2 p-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Capabilities
            </h3>

            {skills.length === 0 && (
                <div className="text-xs text-gray-500 italic">No skills loaded</div>
            )}

            {skills.map((skill) => (
                <div
                    key={skill.id}
                    className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="text-sm font-medium text-gray-200 truncate" title={skill.name}>
                            {skill.name}
                        </span>
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
        </div>
    );
};
