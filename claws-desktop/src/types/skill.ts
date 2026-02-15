// Unified Skill interface for Claws Desktop

export type SkillSource = 'builtin' | 'vercel' | 'local';

export interface Skill {
    id: string;
    name: string;
    description: string;
    source: SkillSource;
    isEnabled: boolean;
    // System prompt for AI injection
    systemPrompt?: string;
    // Optional fields from Vercel/Agent Skills spec
    license?: string;
    allowedTools?: string[];
    triggers?: string[];
    // Metadata
    icon?: string;
    version?: string;
    installedAt?: number;
}

export interface SkillMetadata {
    id: string;
    name: string;
    description: string;
    owner: string;
    version?: string;
}

export interface SkillInstallResult {
    success: boolean;
    skill?: Skill;
    error?: string;
}
