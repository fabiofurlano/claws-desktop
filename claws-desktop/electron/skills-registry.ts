/**
 * Skills Registry Service
 *
 * Manages Vercel Skills integration for Claws Desktop.
 * - Lists installed skills from userData/skills directory
 * - Installs skills via npx skills CLI
 * - Parses SKILL.md files (YAML frontmatter + Markdown)
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import matter from 'gray-matter';
import type { Skill, SkillMetadata, SkillInstallResult, SkillSource } from '../src/types/skill';

const execAsync = promisify(exec);

/**
 * Validate skill ID to prevent command injection
 * Only allows alphanumeric characters, hyphens, underscores, and forward slashes
 * Valid formats: "skill-name" or "owner/skill-name"
 */
function isValidSkillId(skillId: string): boolean {
    // Allow format: owner/skill-name or skill-name
    // Only alphanumeric, hyphens, underscores, forward slashes
    return /^[a-zA-Z0-9/_-]+$/.test(skillId);
}

// Skills directory in userData
function getSkillsDirectory(): string {
    const skillsDir = path.join(app.getPath('userData'), 'skills');
    if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
    }
    return skillsDir;
}

/**
 * Parse a SKILL.md file and extract skill data
 */
function parseSkillFile(skillPath: string, skillId: string): Skill | null {
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
        console.warn(`[SkillsRegistry] No SKILL.md found in ${skillPath}`);
        return null;
    }

    try {
        const fileContent = fs.readFileSync(skillMdPath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Determine source based on directory structure or metadata
        const source: SkillSource = data.source || 'vercel';

        const skill: Skill = {
            id: skillId,
            name: data.name || skillId,
            description: data.description || '',
            source,
            isEnabled: data.isEnabled ?? data.enabled ?? true,
            systemPrompt: content.trim() || undefined,
            license: data.license,
            allowedTools: data.tools || data.allowedTools,
            triggers: data.triggers,
            icon: data.icon,
            version: data.version,
            installedAt: fs.statSync(skillPath).birthtimeMs,
        };

        return skill;
    } catch (error) {
        console.error(`[SkillsRegistry] Error parsing skill ${skillId}:`, error);
        return null;
    }
}

/**
 * List all installed skills
 */
export async function listInstalledSkills(): Promise<Skill[]> {
    const skillsDir = getSkillsDirectory();
    const skills: Skill[] = [];

    try {
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillPath = path.join(skillsDir, entry.name);
                const skill = parseSkillFile(skillPath, entry.name);
                if (skill) {
                    skills.push(skill);
                }
            }
        }
    } catch (error) {
        console.error('[SkillsRegistry] Error listing skills:', error);
    }

    return skills;
}

/**
 * Install a skill using npx skills CLI
 */
export async function installSkill(skillId: string): Promise<SkillInstallResult> {
    // Validate skill ID to prevent command injection
    if (!isValidSkillId(skillId)) {
        return { success: false, error: 'Invalid skill ID format' };
    }

    const skillsDir = getSkillsDirectory();

    try {
        console.log(`[SkillsRegistry] Installing skill: ${skillId}`);

        // Run npx skills add command
        const { stdout, stderr } = await execAsync(`npx skills add ${skillId}`, {
            cwd: skillsDir,
            env: {
                ...process.env,
                // Set skills directory as target
                SKILLS_DIR: skillsDir,
            },
            timeout: 120000, // 2 minutes timeout
        });

        if (stderr && !stderr.includes('npm warn')) {
            console.warn('[SkillsRegistry] npx stderr:', stderr);
        }

        console.log('[SkillsRegistry] npx stdout:', stdout);

        // Verify installation by checking if skill directory exists
        const skillPath = path.join(skillsDir, skillId);
        if (fs.existsSync(skillPath)) {
            const skill = parseSkillFile(skillPath, skillId);
            if (skill) {
                return { success: true, skill };
            }
        }

        // If we get here, the skill was installed but we couldn't parse it
        // Try to find any new directory that was created
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== skillId) {
                const skillPath = path.join(skillsDir, entry.name);
                const stat = fs.statSync(skillPath);
                // If created in the last 5 seconds, likely our new skill
                if (Date.now() - stat.birthtimeMs < 5000) {
                    const skill = parseSkillFile(skillPath, entry.name);
                    if (skill) {
                        return { success: true, skill };
                    }
                }
            }
        }

        return {
            success: true,
            skill: {
                id: skillId,
                name: skillId,
                description: 'Skill installed successfully',
                source: 'vercel',
                isEnabled: true,
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillsRegistry] Failed to install skill ${skillId}:`, errorMessage);

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Uninstall a skill by removing its directory
 */
export async function uninstallSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
    const skillsDir = getSkillsDirectory();
    const skillPath = path.join(skillsDir, skillId);

    try {
        if (!fs.existsSync(skillPath)) {
            return { success: false, error: `Skill ${skillId} is not installed` };
        }

        // Remove skill directory recursively
        fs.rmSync(skillPath, { recursive: true, force: true });

        console.log(`[SkillsRegistry] Uninstalled skill: ${skillId}`);
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillsRegistry] Failed to uninstall skill ${skillId}:`, errorMessage);

        return { success: false, error: errorMessage };
    }
}

/**
 * Toggle skill enabled state
 */
export async function toggleSkill(skillId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const skillsDir = getSkillsDirectory();
    const skillPath = path.join(skillsDir, skillId);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    try {
        if (!fs.existsSync(skillMdPath)) {
            return { success: false, error: `Skill ${skillId} SKILL.md not found` };
        }

        const fileContent = fs.readFileSync(skillMdPath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Update the enabled state in frontmatter
        data.enabled = enabled;

        // Reconstruct the file
        const updatedContent = matter.stringify(content, data);
        fs.writeFileSync(skillMdPath, updatedContent, 'utf-8');

        console.log(`[SkillsRegistry] Toggled skill ${skillId} to ${enabled ? 'enabled' : 'disabled'}`);
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillsRegistry] Failed to toggle skill ${skillId}:`, errorMessage);

        return { success: false, error: errorMessage };
    }
}

/**
 * Search for available skills (placeholder for future API integration)
 * Returns a list of popular/recommended skills
 */
export async function searchSkills(query?: string): Promise<SkillMetadata[]> {
    // Placeholder: In the future, this will call the Vercel Skills API
    // For now, return a static list of popular skills

    const popularSkills: SkillMetadata[] = [
        {
            id: 'vercel/deploy',
            name: 'Deploy',
            description: 'Deploy your project to Vercel with a single command',
            owner: 'vercel',
            version: '1.0.0',
        },
        {
            id: 'vercel/analytics',
            name: 'Analytics',
            description: 'View and manage Vercel Analytics for your projects',
            owner: 'vercel',
            version: '1.0.0',
        },
        {
            id: 'vercel/storage',
            name: 'Storage',
            description: 'Manage Vercel Storage (Postgres, KV, Blob, Edge Config)',
            owner: 'vercel',
            version: '1.0.0',
        },
        {
            id: 'community/git',
            name: 'Git Helper',
            description: 'Help with Git commands and workflows',
            owner: 'community',
            version: '1.0.0',
        },
        {
            id: 'community/code-review',
            name: 'Code Review',
            description: 'AI-powered code review and suggestions',
            owner: 'community',
            version: '1.0.0',
        },
    ];

    if (query) {
        const lowerQuery = query.toLowerCase();
        return popularSkills.filter(
            skill =>
                skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.id.toLowerCase().includes(lowerQuery)
        );
    }

    return popularSkills;
}

/**
 * Get a single skill by ID
 */
export async function getSkill(skillId: string): Promise<Skill | null> {
    const skillsDir = getSkillsDirectory();
    const skillPath = path.join(skillsDir, skillId);

    if (!fs.existsSync(skillPath)) {
        return null;
    }

    return parseSkillFile(skillPath, skillId);
}

/**
 * Get combined system prompt from all enabled skills
 */
export async function getEnabledSkillsSystemPrompt(): Promise<string> {
    const skills = await listInstalledSkills();
    const enabledSkills = skills.filter(skill => skill.isEnabled);

    if (enabledSkills.length === 0) {
        return '';
    }

    const prompts = enabledSkills
        .filter(skill => skill.systemPrompt)
        .map(skill => `## Skill: ${skill.name}\n${skill.systemPrompt}`);

    return `# Active Skills\n\nYou have access to the following skills:\n\n${prompts.join('\n\n')}`;
}

// Re-export types for convenience
export type { Skill, SkillMetadata, SkillInstallResult, SkillSource };
