// Skill definition and loader for Claws Agent Mode

export interface Skill {
    id: string;
    name: string;
    description: string;
    icon: string;
    isEnabled: boolean;
    isBuiltIn: boolean;
    // System prompt injection when skill is active
    systemPrompt: string;
    // Tags for categorization
    tags: string[];
}

// Built-in skills that ship with Claws
export const BUILT_IN_SKILLS: Skill[] = [
    {
        id: 'writing-assistant',
        name: 'Writing Assistant',
        description: 'Helps with grammar, style, tone, and creative writing. Can edit and improve text.',
        icon: '✍️',
        isEnabled: true,
        isBuiltIn: true,
        systemPrompt: `You also have the Writing Assistant skill active.
When the user asks you to write, edit, or improve text:
- Offer suggestions for grammar, clarity, and style
- Adapt tone based on context (formal, casual, technical)
- Provide alternatives and explain your changes
- Support creative writing, emails, documentation, and more`,
        tags: ['writing', 'editing', 'grammar'],
    },
    {
        id: 'task-planning',
        name: 'Task Planning',
        description: 'Breaks down complex tasks into actionable steps. Creates timelines and priorities.',
        icon: '📋',
        isEnabled: true,
        isBuiltIn: true,
        systemPrompt: `You also have the Task Planning skill active.
When the user needs help planning or organizing:
- Break complex tasks into clear, actionable steps
- Estimate time and effort for each step
- Identify dependencies and priorities
- Suggest a logical order of execution
- Use checkboxes and structured formats`,
        tags: ['planning', 'productivity', 'organization'],
    },
    {
        id: 'code-helper',
        name: 'Code Helper',
        description: 'Assists with coding, debugging, and technical explanations. Supports multiple languages.',
        icon: '💻',
        isEnabled: false,
        isBuiltIn: true,
        systemPrompt: `You also have the Code Helper skill active.
When the user asks about code:
- Write clean, well-commented code
- Explain code logic step by step
- Help debug issues by analyzing error messages
- Suggest best practices and optimizations
- Support JavaScript, TypeScript, Python, and more`,
        tags: ['coding', 'debugging', 'programming'],
    },
    {
        id: 'research-analyst',
        name: 'Research Analyst',
        description: 'Helps analyze topics, compare options, and synthesize information into clear summaries.',
        icon: '🔍',
        isEnabled: false,
        isBuiltIn: true,
        systemPrompt: `You also have the Research Analyst skill active.
When the user needs research or analysis:
- Present balanced, well-organized information
- Compare pros and cons of different options
- Cite sources and evidence where possible
- Synthesize complex topics into clear summaries
- Highlight key takeaways and recommendations`,
        tags: ['research', 'analysis', 'comparison'],
    },
];

// Skill store using Zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SkillState {
    skills: Skill[];
    toggleSkill: (id: string) => void;
    getEnabledSkills: () => Skill[];
    getSkillPrompts: () => string;
}

export const useSkillStore = create<SkillState>()(
    persist(
        (set, get) => ({
            skills: BUILT_IN_SKILLS,

            toggleSkill: (id) => {
                set((state) => ({
                    skills: state.skills.map((s) =>
                        s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
                    ),
                }));
            },

            getEnabledSkills: () => {
                return get().skills.filter((s) => s.isEnabled);
            },

            // Concatenate all enabled skill prompts for injection into the system message
            getSkillPrompts: () => {
                const enabled = get().skills.filter((s) => s.isEnabled);
                if (enabled.length === 0) return '';
                return '\n\n--- Active Skills ---\n' +
                    enabled.map((s) => s.systemPrompt).join('\n\n');
            },
        }),
        {
            name: 'claws-skills',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Selector hooks
export const useSkills = () => useSkillStore((state) => state.skills);
export const useSkillActions = () => useSkillStore((state) => ({
    toggleSkill: state.toggleSkill,
    getEnabledSkills: state.getEnabledSkills,
    getSkillPrompts: state.getSkillPrompts,
}));
