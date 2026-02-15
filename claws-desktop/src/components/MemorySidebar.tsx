import { useAgentMemory, useAgentIsLearning, useAgentActions } from '../stores/agent-store';
import { useSkills, useSkillActions } from '../stores/skill-store';

export function MemorySidebar() {
    const memory = useAgentMemory();
    const isLearning = useAgentIsLearning();
    const { toggleLearning } = useAgentActions();
    const skills = useSkills();
    const { toggleSkill } = useSkillActions();

    const patternCount = memory.patterns.length;
    const preferenceCount = Object.keys(memory.preferences).length;
    const enabledSkillCount = skills.filter((s) => s.isEnabled).length;

    return (
        <div className="w-72 flex-shrink-0 border-l border-agent-border bg-agent-surface overflow-y-auto">
            <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-agent-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-agent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-agent-text">Memory</h3>
                </div>

                {/* Learning Toggle */}
                <div className="mb-6">
                    <button
                        onClick={toggleLearning}
                        className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl
              text-sm font-medium transition-all duration-200
              ${isLearning
                                ? 'bg-agent-primary/10 text-agent-primary border border-agent-primary/20'
                                : 'bg-agent-surfaceAlt text-agent-muted border border-agent-border hover:border-agent-primary/30'
                            }
            `}
                    >
                        <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${isLearning ? 'text-agent-primary' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span>Learning</span>
                        </div>
                        <div
                            className={`w-8 h-5 rounded-full transition-colors duration-200 ${isLearning ? 'bg-agent-primary' : 'bg-zinc-700'}`}
                        >
                            <div
                                className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 mt-0.5 ${isLearning ? 'translate-x-3' : 'translate-x-0.5'}`}
                            />
                        </div>
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="p-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border text-center">
                        <p className="text-xl font-semibold text-agent-text font-mono">{patternCount}</p>
                        <p className="text-[10px] text-agent-muted mt-0.5">Patterns</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border text-center">
                        <p className="text-xl font-semibold text-agent-text font-mono">{preferenceCount}</p>
                        <p className="text-[10px] text-agent-muted mt-0.5">Prefs</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border text-center">
                        <p className="text-xl font-semibold text-agent-text font-mono">{enabledSkillCount}</p>
                        <p className="text-[10px] text-agent-muted mt-0.5">Skills</p>
                    </div>
                </div>

                {/* Skills Section */}
                <div className="mb-6">
                    <h4 className="text-xs font-medium text-agent-muted uppercase tracking-wider mb-3">
                        Skills
                    </h4>
                    <div className="space-y-1.5">
                        {skills.map((skill) => (
                            <button
                                key={skill.id}
                                onClick={() => toggleSkill(skill.id)}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left
                                    transition-all duration-200 group
                                    ${skill.isEnabled
                                        ? 'bg-agent-primary/8 border border-agent-primary/20'
                                        : 'bg-agent-surfaceAlt border border-agent-border hover:border-agent-primary/20'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-base flex-shrink-0">{skill.icon}</span>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-medium truncate ${skill.isEnabled ? 'text-agent-text' : 'text-agent-muted'
                                            }`}>
                                            {skill.name}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className={`w-6 h-3.5 rounded-full transition-colors flex-shrink-0 ${skill.isEnabled ? 'bg-agent-primary' : 'bg-zinc-700'
                                        }`}
                                >
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full bg-white transform transition-transform mt-0.5 ${skill.isEnabled ? 'translate-x-3' : 'translate-x-0.5'
                                            }`}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* User Profile */}
                {memory.userProfile.name && (
                    <div className="mb-6">
                        <h4 className="text-xs font-medium text-agent-muted uppercase tracking-wider mb-2">
                            Profile
                        </h4>
                        <div className="px-3 py-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border">
                            <p className="text-sm text-agent-text">{memory.userProfile.name}</p>
                        </div>
                    </div>
                )}

                {/* Patterns List */}
                {memory.patterns.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-agent-muted uppercase tracking-wider mb-3">
                            Recent Patterns
                        </h4>
                        <div className="space-y-2">
                            {memory.patterns.slice(-5).reverse().map((pattern) => (
                                <div
                                    key={pattern.id}
                                    className="px-3 py-2.5 rounded-xl bg-agent-surfaceAlt border border-agent-border group hover:border-agent-primary/30 transition-colors duration-200"
                                >
                                    <p className="text-xs text-agent-text truncate">{pattern.description}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] text-agent-muted font-mono">
                                            x{pattern.occurrences}
                                        </span>
                                        <span className="text-[10px] text-agent-border">•</span>
                                        <span className="text-[10px] text-agent-muted">
                                            {new Date(pattern.lastSeen).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
