import React, { useState, useEffect, useCallback } from 'react';
import { Skill, SkillMetadata } from '../types/skill';

interface SkillsBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: (skill: Skill) => void;
}

export const SkillsBrowser: React.FC<SkillsBrowserProps> = ({
    isOpen,
    onClose,
    onInstall,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableSkills, setAvailableSkills] = useState<SkillMetadata[]>([]);
    const [installedSkillIds, setInstalledSkillIds] = useState<Set<string>>(new Set());
    const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
    const [errorMessages, setErrorMessages] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // Load installed skills on mount
    const loadInstalledSkills = useCallback(async () => {
        try {
            const installed = await window.electron.skills.list();
            setInstalledSkillIds(new Set(installed.map(s => s.id)));
        } catch (error) {
            console.error('Failed to load installed skills:', error);
        }
    }, []);

    // Search for skills
    const searchSkills = useCallback(async (query: string) => {
        setIsSearchLoading(true);
        try {
            const results = await window.electron.skills.search(query);
            setAvailableSkills(results);
        } catch (error) {
            console.error('Failed to search skills:', error);
            setAvailableSkills([]);
        } finally {
            setIsSearchLoading(false);
        }
    }, []);

    // Load skills when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            loadInstalledSkills().then(() => {
                searchSkills('');
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [isOpen, loadInstalledSkills, searchSkills]);

    // Handle search form submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        searchSkills(searchQuery);
    };

    // Handle skill installation
    const handleInstall = async (skillId: string) => {
        setInstallingIds(prev => new Set(prev).add(skillId));
        setErrorMessages(prev => {
            const next = new Map(prev);
            next.delete(skillId);
            return next;
        });

        try {
            const result = await window.electron.skills.install(skillId);

            if (result.success && result.skill) {
                setInstalledSkillIds(prev => new Set(prev).add(skillId));
                onInstall(result.skill);
            } else {
                setErrorMessages(prev => new Map(prev).set(skillId, result.error || 'Installation failed'));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Installation failed';
            setErrorMessages(prev => new Map(prev).set(skillId, errorMessage));
        } finally {
            setInstallingIds(prev => {
                const next = new Set(prev);
                next.delete(skillId);
                return next;
            });
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-100">
                        Browse Skills
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="p-4 border-b border-gray-700">
                    <div className="mb-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                        <p className="text-xs text-blue-300">
                            <strong>Skills</strong> add new capabilities to your AI assistant.
                            Click "Install" to add a skill - no coding required!
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skills..."
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            disabled={isSearchLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                            {isSearchLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </form>

                {/* Skills List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-400">Loading skills...</div>
                        </div>
                    ) : availableSkills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 mb-4 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <p>No skills found</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Try a different search term
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {availableSkills.map((skill) => {
                                const isInstalled = installedSkillIds.has(skill.id);
                                const isInstalling = installingIds.has(skill.id);
                                const errorMessage = errorMessages.get(skill.id);

                                return (
                                    <div
                                        key={skill.id}
                                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-medium text-gray-100 truncate">
                                                        {skill.name}
                                                    </h3>
                                                    {skill.version && skill.version !== 'latest' && (
                                                        <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                                                            v{skill.version}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                                    {skill.description}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">
                                                        by <span className="text-gray-400">{skill.owner}</span>
                                                    </span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-xs text-gray-600" title={`Skill ID: ${skill.id}`}>
                                                        {skill.id.split(':')[1] || skill.id.split('/')[1] || skill.id}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleInstall(skill.id)}
                                                disabled={isInstalled || isInstalling}
                                                className={`
                                                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                                                    ${isInstalled
                                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                        : isInstalling
                                                            ? 'bg-blue-700 text-blue-200 cursor-wait'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    }
                                                `}
                                            >
                                                {isInstalled
                                                    ? 'Installed'
                                                    : isInstalling
                                                        ? 'Installing...'
                                                        : 'Install'
                                                }
                                            </button>
                                        </div>

                                        {errorMessage && (
                                            <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                                                {errorMessage}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 text-center">
                    <p className="text-xs text-gray-500">
                        Discover more skills at{' '}
                        <a
                            href="https://skills.sh"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            skills.sh
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
