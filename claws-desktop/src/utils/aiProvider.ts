
import type { Message } from '../types/message';
import type { ProviderConfig } from '../stores/provider-store';
import type { Mode } from '../stores/mode-store';
import { useSkillStore } from '../stores/skill-store';

// System prompts for each mode
const SYSTEM_PROMPTS: Record<Mode, string> = {
    chat: `You are Claws, a friendly AI assistant in Chat Mode. 
Be conversational, helpful, and concise. 
This is a casual conversation — no memory is stored between sessions.
Keep responses brief unless asked for detail.`,

    agent: `You are Claws, a powerful AI assistant in Agent Mode.
You have full memory and learning capabilities. 
Be thorough, precise, and proactive.
Remember previous context and build on it.
When the user shares preferences, acknowledge them as something you'll remember.`,
};

/**
 * Send a message to the active AI provider via Electron Main Process.
 * Accumulates streaming response into a single string for compatibility.
 */
export async function sendToAI(
    messages: Message[],
    mode: Mode,
    provider: ProviderConfig,
): Promise<string> {

    // 1. Prepare System Message
    let systemContent = SYSTEM_PROMPTS[mode];
    if (mode === 'agent') {
        const skillPrompts = useSkillStore.getState().getSkillPrompts();
        if (skillPrompts) {
            systemContent += skillPrompts;
        }
    }

    // 2. Prepare API Messages
    // Note: We perform simple role mapping here if needed
    const apiMessages = [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        })),
    ];

    // Anthropic specific: Extract system message if present
    if (provider.baseUrl.includes('anthropic')) {
        // The main process ai-service handles standard OpenAI format.
        // If we want to support Anthropic natively in backend, we should update ai-service.ts.
    }

    // 3. Make IPC Call
    return new Promise(async (resolve, reject) => {
        try {
            const requestId = await window.electron.ai.streamCompletion({
                apiKey: provider.apiKey,
                baseUrl: provider.baseUrl,
                model: provider.model,
                messages: apiMessages,
            });

            let fullResponse = '';

            const cleanupChunk = window.electron.ai.onChunk((id, chunk) => {
                if (id === requestId) fullResponse += chunk;
            });

            const cleanupDone = window.electron.ai.onDone((id) => {
                if (id === requestId) {
                    cleanupChunk();
                    cleanupDone();
                    cleanupError();
                    if (!fullResponse) resolve('No response received.');
                    else resolve(fullResponse);
                }
            });

            const cleanupError = window.electron.ai.onError((id, error) => {
                if (id === requestId) {
                    cleanupChunk();
                    cleanupDone();
                    cleanupError();
                    reject(new Error(error));
                }
            });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Test if a provider connection is working by sending a minimal request.
 */
export async function testProviderConnection(provider: ProviderConfig): Promise<boolean> {
    try {
        await sendToAI(
            [{ id: 'test', role: 'user', content: 'Hi', timestamp: Date.now() }],
            'chat',
            { ...provider, model: provider.model || 'gpt-3.5-turbo' } // ensure model is set
        );
        return true;
    } catch (e) {
        console.error('Connection test failed:', e);
        return false;
    }
}

// Default provider configs
// NOTE: Z.AI model names MUST be lowercase (glm-4.7, not GLM-4.7)
// See OpenClaw docs: model refs are normalized to lowercase
export const DEFAULT_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        apiKey: '',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1',
        isActive: true,
    },
    anthropic: {
        name: 'Anthropic',
        apiKey: '',
        model: 'claude-3-5-sonnet-20240620',
        baseUrl: 'https://api.anthropic.com/v1',
        isActive: true,
    },
    openrouter: {
        name: 'OpenRouter',
        apiKey: '',
        model: 'openai/gpt-4o-mini',
        baseUrl: 'https://openrouter.ai/api/v1',
        isActive: true,
    },
    zai: {
        name: 'Z.AI (GLM Coding)',
        apiKey: '',
        model: 'glm-4.7',  // MUST be lowercase - Z.AI is case-sensitive
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        isActive: true,
    },
    zaiGlobal: {
        name: 'Z.AI (GLM Global)',
        apiKey: '',
        model: 'glm-4.7',  // MUST be lowercase
        baseUrl: 'https://api.z.ai/api/paas/v4',
        isActive: true,
    },
} as const;
