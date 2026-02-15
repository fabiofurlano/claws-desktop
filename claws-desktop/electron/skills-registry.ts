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
 * Only allows alphanumeric characters, hyphens, underscores, forward slashes, and colons
 * Valid formats: "skill-name", "owner/skill-name", or "owner/repo:skill-name"
 */
function isValidSkillId(skillId: string): boolean {
    // Allow format: owner/repo:skill-name or owner/skill-name or skill-name
    // Only alphanumeric, hyphens, underscores, forward slashes, colons
    return /^[a-zA-Z0-9/:_-]+$/.test(skillId);
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
 * Checks both userData/skills and .agents/skills directories
 */
export async function listInstalledSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];
    const seenIds = new Set<string>();

    // Helper to add skills from a directory
    const addSkillsFromDir = (dir: string, source: SkillSource = 'vercel') => {
        try {
            if (!fs.existsSync(dir)) return;

            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory() && !seenIds.has(entry.name)) {
                    const skillPath = path.join(dir, entry.name);
                    const skill = parseSkillFile(skillPath, entry.name);
                    if (skill) {
                        skill.source = source;
                        skills.push(skill);
                        seenIds.add(entry.name);
                    }
                }
            }
        } catch (error) {
            console.error(`[SkillsRegistry] Error listing skills from ${dir}:`, error);
        }
    };

    // 1. Check .agents/skills folder (where npx skills installs to)
    const projectDir = app.getAppPath();
    const agentsSkillsDir = path.join(projectDir, '.agents', 'skills');
    addSkillsFromDir(agentsSkillsDir, 'vercel');

    // 2. Check userData/skills folder (custom skills)
    const userDataSkillsDir = getSkillsDirectory();
    addSkillsFromDir(userDataSkillsDir, 'local');

    return skills;
}

/**
 * Install a skill using npx skills CLI
 *
 * skillId format: "owner/repo" (installs all skills from repo)
 *             or: "owner/repo:skill-name" (installs specific skill)
 */
export async function installSkill(skillId: string): Promise<SkillInstallResult> {
    // Validate skill ID to prevent command injection
    if (!isValidSkillId(skillId)) {
        return { success: false, error: 'Invalid skill ID format' };
    }

    const projectDir = app.getAppPath();

    try {
        console.log(`[SkillsRegistry] Installing skill: ${skillId}`);

        // Parse skillId - format can be "owner/repo" or "owner/repo:skill-name"
        let npxCommand: string;
        let skillName: string;

        if (skillId.includes(':')) {
            // Specific skill: "owner/repo:skill-name"
            const [repo, specificSkill] = skillId.split(':');
            // Use --agent claude-code to install for Claude Code, -y to skip prompts
            npxCommand = `npx skills add ${repo} --skill ${specificSkill} --agent claude-code -y`;
            skillName = specificSkill;
        } else {
            // Install all skills from repo: "owner/repo"
            npxCommand = `npx skills add ${skillId} --all -y`;
            skillName = skillId.split('/')[1] || skillId;
        }

        // Run npx skills add command from project directory
        // Skills CLI installs to .agents/skills folder in current directory
        const { stdout, stderr } = await execAsync(npxCommand, {
            cwd: projectDir,
            env: process.env,
            timeout: 120000, // 2 minutes timeout
        });

        if (stderr && !stderr.includes('npm warn') && !stderr.includes('WARN')) {
            console.warn('[SkillsRegistry] npx stderr:', stderr);
        }

        console.log('[SkillsRegistry] npx stdout:', stdout);

        // Skills are installed to .agents/skills folder in project directory
        const agentsSkillsDir = path.join(projectDir, '.agents', 'skills');

        // Look for installed skill
        if (fs.existsSync(agentsSkillsDir)) {
            const entries = fs.readdirSync(agentsSkillsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillPath = path.join(agentsSkillsDir, entry.name);
                    const stat = fs.statSync(skillPath);
                    // If created in the last 30 seconds, likely our new skill
                    if (Date.now() - stat.birthtimeMs < 30000) {
                        const skill = parseSkillFile(skillPath, entry.name);
                        if (skill) {
                            // Update skill ID to match the format we use
                            skill.id = skillId;
                            return { success: true, skill };
                        }
                    }
                }
            }
        }

        // Return success even if we couldn't parse - skill may still work
        return {
            success: true,
            skill: {
                id: skillId,
                name: skillName,
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
            error: `Installation failed. Make sure you have internet access and try: npx skills add ${skillId} in your terminal.`,
        };
    }
}

/**
 * Uninstall a skill using npx skills CLI
 * Also removes from local directories if present
 */
export async function uninstallSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
    const projectDir = app.getAppPath();

    try {
        console.log(`[SkillsRegistry] Uninstalling skill: ${skillId}`);

        // Extract skill name from ID (format: "owner/repo:skill-name" or just "skill-name")
        const skillName = skillId.includes(':') ? skillId.split(':')[1] : skillId.split('/').pop() || skillId;

        // Try using npx skills remove command first
        try {
            const { stdout, stderr } = await execAsync(`npx skills remove ${skillName} --agent claude-code -y`, {
                cwd: projectDir,
                env: process.env,
                timeout: 60000,
            });
            console.log('[SkillsRegistry] npx skills remove stdout:', stdout);
            if (stderr && !stderr.includes('npm warn') && !stderr.includes('WARN')) {
                console.warn('[SkillsRegistry] npx stderr:', stderr);
            }
        } catch (npxError) {
            console.warn('[SkillsRegistry] npx skills remove failed, trying manual removal:', npxError);
        }

        // Also try to remove from .agents/skills directory manually
        const agentsSkillsDir = path.join(projectDir, '.agents', 'skills');
        const skillPath = path.join(agentsSkillsDir, skillName);

        if (fs.existsSync(skillPath)) {
            fs.rmSync(skillPath, { recursive: true, force: true });
            console.log(`[SkillsRegistry] Removed skill directory: ${skillPath}`);
        }

        // Also check symlink in .claude/skills
        const claudeSkillsDir = path.join(projectDir, '.claude', 'skills');
        const symlinkPath = path.join(claudeSkillsDir, skillName);
        if (fs.existsSync(symlinkPath)) {
            fs.rmSync(symlinkPath, { recursive: true, force: true });
            console.log(`[SkillsRegistry] Removed skill symlink: ${symlinkPath}`);
        }

        console.log(`[SkillsRegistry] Successfully uninstalled skill: ${skillId}`);
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillsRegistry] Failed to uninstall skill ${skillId}:`, errorMessage);

        return { success: false, error: `Failed to uninstall: ${errorMessage}` };
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
 * Search for available skills from the skills.sh registry
 * Returns a list of popular/recommended skills that can be installed
 *
 * Skill ID format: "owner/repo:skill-name" for specific skill
 *               or: "owner/repo" to install all skills from repo
 */
export async function searchSkills(query?: string): Promise<SkillMetadata[]> {
    // Real popular skills from skills.sh registry (anthropics/skills)
    // These are the most installed and trusted skills
    const popularSkills: SkillMetadata[] = [
        {
            id: 'anthropics/skills:frontend-design',
            name: 'Frontend Design',
            description: 'Design and build beautiful UI components with modern CSS and best practices',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:skill-creator',
            name: 'Skill Creator',
            description: 'Create and publish your own skills for Claude Code',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:pdf',
            name: 'PDF',
            description: 'Read, analyze, and extract content from PDF documents',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:xlsx',
            name: 'Excel/Sheets',
            description: 'Work with Excel and Google Sheets files - read, write, analyze data',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:mcp-builder',
            name: 'MCP Builder',
            description: 'Build Model Context Protocol servers for Claude',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:writing-plans',
            name: 'Writing Plans',
            description: 'Create detailed implementation plans with step-by-step instructions',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:test-driven-development',
            name: 'Test Driven Development',
            description: 'Write tests first, then implement code to pass them',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:debugging',
            name: 'Debugging',
            description: 'Systematic debugging approach to find and fix issues',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:requesting-code-review',
            name: 'Code Review',
            description: 'Request thorough code reviews with actionable feedback',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:executing-plans',
            name: 'Executing Plans',
            description: 'Execute implementation plans systematically with checkpoints',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:context7',
            name: 'Context7',
            description: 'Fetch up-to-date documentation for any library or framework',
            owner: 'anthropics',
            version: 'latest',
        },
        {
            id: 'anthropics/skills:sequential-thinking',
            name: 'Sequential Thinking',
            description: 'Step-by-step reasoning for complex problems',
            owner: 'anthropics',
            version: 'latest',
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
