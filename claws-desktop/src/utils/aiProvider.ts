import type { Message } from '../types/message';
import type { ProviderConfig } from '../stores/provider-store';
import type { Mode } from '../stores/mode-store';

// Provider adapter interface — extensible for future providers
interface ProviderAdapter {
    sendMessage: (
        messages: Array<{ role: string; content: string }>,
        config: ProviderConfig,
        mode: Mode,
    ) => Promise<string>;
    testConnection: (config: ProviderConfig) => Promise<boolean>;
}

// OpenAI-compatible adapter (works with OpenAI, OpenRouter, local LLMs)
const openAIAdapter: ProviderAdapter = {
    async sendMessage(messages, config, mode) {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                // Chat mode: more creative. Agent mode: more focused.
                temperature: mode === 'chat' ? 0.7 : 0.3,
                max_tokens: mode === 'chat' ? 1000 : 4000,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                (error as Record<string, Record<string, string>>)?.error?.message ||
                `API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received.';
    },

    async testConnection(config) {
        try {
            const response = await fetch(`${config.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    },
};

// Anthropic adapter (Claude API format)
const anthropicAdapter: ProviderAdapter = {
    async sendMessage(messages, config, mode) {
        // Anthropic requires system message separate from messages array
        const systemMsg = messages.find((m) => m.role === 'system');
        const chatMessages = messages.filter((m) => m.role !== 'system');

        const response = await fetch(`${config.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                // Allow browser usage via CORS
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: mode === 'chat' ? 1000 : 4000,
                ...(systemMsg ? { system: systemMsg.content } : {}),
                messages: chatMessages.map((m) => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content,
                })),
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                (error as Record<string, Record<string, string>>)?.error?.message ||
                `API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        return data.content?.[0]?.text || 'No response received.';
    },

    async testConnection(config) {
        try {
            // Anthropic doesn't have a /models endpoint, try a minimal request
            const response = await fetch(`${config.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
            });
            return response.ok;
        } catch {
            return false;
        }
    },
};

// Map provider names to adapters
const adapters: Record<string, ProviderAdapter> = {
    openai: openAIAdapter,
    anthropic: anthropicAdapter,
};

// Detect adapter from base URL
function getAdapterForProvider(config: ProviderConfig): ProviderAdapter {
    if (config.baseUrl.includes('anthropic')) {
        return adapters.anthropic;
    }
    // Default to OpenAI-compatible (works with OpenAI, OpenRouter, local)
    return adapters.openai;
}

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
 * Send a message to the active AI provider.
 * Converts Message[] to the format expected by the API.
 */
export async function sendToAI(
    messages: Message[],
    mode: Mode,
    provider: ProviderConfig,
): Promise<string> {
    const adapter = getAdapterForProvider(provider);

    const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPTS[mode] },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    return adapter.sendMessage(apiMessages, provider, mode);
}

/**
 * Test if a provider connection is working.
 */
export async function testProviderConnection(provider: ProviderConfig): Promise<boolean> {
    const adapter = getAdapterForProvider(provider);
    return adapter.testConnection(provider);
}

// Default provider configs for quick setup
export const DEFAULT_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        apiKey: '',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        isActive: true,
    },
    anthropic: {
        name: 'Anthropic',
        apiKey: '',
        model: 'claude-sonnet-4-20250514',
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
} as const;
