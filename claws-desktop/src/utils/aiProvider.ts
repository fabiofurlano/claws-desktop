
import type { Message } from '../types/message';
import type { ProviderConfig } from '../stores/provider-store';
import type { Mode } from '../stores/mode-store';
import { useSkillStore } from '../stores/skill-store';
import { useAgentStore } from '../stores/agent-store';

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
        // Get built-in skill prompts
        const builtInPrompts = useSkillStore.getState().getSkillPrompts();
        if (builtInPrompts) {
            systemContent += builtInPrompts;
        }

        // Get Vercel/installed skill prompts from agent store
        const agentSkills = useAgentStore.getState().skills;
        const enabledVercelSkills = agentSkills.filter(s => s.isEnabled && s.source !== 'builtin' && s.systemPrompt);
        if (enabledVercelSkills.length > 0) {
            systemContent += '\n\n--- Installed Skills ---\n';
            systemContent += enabledVercelSkills.map(s => s.systemPrompt).join('\n\n');
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

    // 3. Make IPC Call or Fallback to Fetch
    if (window.electron && window.electron.ai) {
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
    } else {
        // Fallback for Web/Browser environment (Testing purposes)
        try {
            console.warn('Electron IPC not found, falling back to direct fetch');
            const response = await fetch(`${provider.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: apiMessages,
                    stream: false // Simple fetch for test, no streaming in fallback yet
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errData)}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response received.';
        } catch (error: any) {
            console.error('Fetch fallback failed:', error);
            throw error;
        }
    }
}

/**
 * Test if a provider connection is working by sending a minimal request.
 */
export async function testProviderConnection(provider: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
        await sendToAI(
            [{ id: 'test', role: 'user', content: 'Hi', timestamp: Date.now() }],
            'chat',
            { ...provider, model: provider.model || 'gpt-3.5-turbo' } // ensure model is set
        );
        return { success: true };
    } catch (e: any) {
        console.error('Connection test failed:', e);
        // Extract meaningful error message
        let errorMessage = e.message || 'Unknown error occurred';

        if (errorMessage.includes('401')) {
            errorMessage = 'Authentication failed (401). Please check your API key.';
        } else if (errorMessage.includes('404')) {
            errorMessage = 'Model or endpoint not found (404). Check provider settings.';
        } else if (errorMessage.includes('429')) {
            errorMessage = 'Rate limit exceeded (429). Please try again later.';
        } else if (errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Network error. Check your internet connection and proxy settings.';
        }

        return { success: false, error: errorMessage };
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
