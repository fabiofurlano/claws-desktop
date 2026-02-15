export interface Skill {
    id: string;
    name: string;
    description: string;
    triggers: string[]; // Keywords or phrases that might trigger this skill
    execute: (context: any) => Promise<string | any>;
    isEnabled: boolean;
}

export class SkillsManager {
    private skills: Map<string, Skill> = new Map();

    constructor() {
        this.loadSkills();
    }

    /**
     * Loads initial set of skills.
     * In the future, this could load from a file or external plugin system.
     */
    private loadSkills() {
        // Basic Echo Skill
        this.registerSkill({
            id: 'echo',
            name: 'Echo',
            description: 'Repeats back what you say.',
            triggers: ['echo', 'repeat', 'say'],
            isEnabled: true,
            execute: async (context: any) => {
                return `Echo: ${context.message || 'nothing to echo'}`;
            },
        });

        // System Info Skill (Placeholder)
        this.registerSkill({
            id: 'system_info',
            name: 'System Info',
            description: 'Returns basic system information (platform, arch).',
            triggers: ['system info', 'os version', 'platform'],
            isEnabled: true,
            execute: async (context: any) => {
                // In a real app, this would use IPC to get actual OS info
                // For now, we return browser info as a fallback
                if (typeof window !== 'undefined' && window.navigator) {
                    return `Platform: ${window.navigator.platform}, User Agent: ${window.navigator.userAgent}`;
                }
                return 'System info not available in this context.';
            },
        });
    }

    public registerSkill(skill: Skill) {
        this.skills.set(skill.id, skill);
    }

    public getSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    public getSkill(id: string): Skill | undefined {
        return this.skills.get(id);
    }

    public toggleSkill(id: string, isEnabled: boolean) {
        const skill = this.skills.get(id);
        if (skill) {
            skill.isEnabled = isEnabled;
            // TODO: Persist this state locally
        }
    }

    public async executeSkill(id: string, context: any): Promise<any> {
        const skill = this.skills.get(id);
        if (!skill) {
            throw new Error(`Skill with id '${id}' not found.`);
        }
        if (!skill.isEnabled) {
            throw new Error(`Skill '${skill.name}' is disabled.`);
        }

        try {
            console.log(`Executing skill: ${skill.name}`);
            return await skill.execute(context);
        } catch (error) {
            console.error(`Error executing skill ${skill.name}:`, error);
            throw error;
        }
    }
}

export const skillsManager = new SkillsManager();
