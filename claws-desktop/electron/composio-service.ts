/**
 * Composio Service Layer
 * Handles Composio API integration and tool discovery
 */

import { Composio } from '@composio/core';
import { getMcpConnections, getConnectedTools } from './database.js';

let composioClient: Composio | null = null;

/**
 * Initialize Composio client with API key
 */
export function initComposio(apiKey: string): Composio {
    composioClient = new Composio({
        apiKey: apiKey,
    });
    return composioClient;
}

/**
 * Get the current Composio client
 */
export function getComposio(): Composio | null {
    return composioClient;
}

/**
 * List available tools from Composio
 * Returns tools the user can connect
 */
export async function listAvailableTools(apiKey?: string): Promise<Array<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    categories: string[];
}>> {
    const client = apiKey ? initComposio(apiKey) : composioClient;

    if (!client) {
        throw new Error('Composio not initialized. Provide API key.');
    }

    try {
        console.log('[Composio] Fetching toolkits...');

        // Get list of available toolkits using the Composio SDK
        const response = await client.toolkits.get({});

        console.log('[Composio] Raw response:', JSON.stringify(response, null, 2).substring(0, 500));

        // The response structure might vary - try different formats
        let toolkits: any[] = [];

        if (Array.isArray(response)) {
            // Response is directly an array
            toolkits = response;
        } else if ((response as any).items) {
            // Response has items property
            toolkits = (response as any).items;
        } else if ((response as any).data) {
            // Response has data property
            toolkits = (response as any).data;
        } else if (typeof response === 'object') {
            // Try to extract from object keys
            const resp = response as any;
            toolkits = resp.toolkits || resp.results || resp.list || [];
        }

        console.log(`[Composio] Found ${toolkits.length} toolkits`);

        return toolkits.map((toolkit: any) => ({
            name: toolkit.name || toolkit.displayName || toolkit.slug,
            slug: toolkit.slug,
            description: toolkit.description || toolkit.meta?.description || '',
            logo: toolkit.logo || toolkit.meta?.logo || toolkit.meta?.logoUrl || '',
            categories: extractCategories(toolkit),
        }));
    } catch (error) {
        console.error('[Composio] Failed to list tools:', error);
        throw error;
    }
}

/**
 * Extract categories from toolkit object (handles different formats)
 */
function extractCategories(toolkit: any): string[] {
    const cats = toolkit.categories ||
                toolkit.meta?.categories ||
                toolkit.category ||
                [];

    if (!Array.isArray(cats)) return [];

    return cats
        .map((cat: any) => {
            if (typeof cat === 'string') return cat;
            if (cat.name) return cat.name;
            if (cat.title) return cat.title;
            return null;
        })
        .filter(Boolean);
}

/**
 * Get toolkit details including auth config information
 */
export async function getToolkitDetails(toolkitSlug: string): Promise<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    authConfigDetails: Array<{
        id?: string;
        mode: string;
        name?: string;
    }>;
}> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        const toolkit = await composioClient.toolkits.get(toolkitSlug);

        // The toolkit response has name, slug, meta (with description, logo), and authConfigDetails
        const meta = (toolkit as any).meta || {};

        return {
            name: toolkit.name || toolkitSlug,
            slug: toolkitSlug,
            description: meta.description || '',
            logo: meta.logo || '',
            authConfigDetails: ((toolkit as any).authConfigDetails || []).map((config: any) => ({
                id: config.id,
                mode: config.mode,
                name: config.name,
            })),
        };
    } catch (error) {
        console.error(`[Composio] Failed to get toolkit details for ${toolkitSlug}:`, error);
        throw error;
    }
}

/**
 * Connect a tool (authorize via Composio)
 * This uses the Composio Connect Link feature
 *
 * @param userId - The external user ID to create the connected account for
 * @param authConfigId - The auth config ID to create the connected account for
 * @param callbackUrl - Optional URL to redirect after connection
 */
export async function connectTool(
    userId: string,
    authConfigId: string,
    callbackUrl?: string
): Promise<{ redirectUrl: string | null; connectionId: string }> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        // Create a connection request using the link method
        const connectionRequest = await composioClient.connectedAccounts.link(
            userId,
            authConfigId,
            callbackUrl ? { callbackUrl } : undefined
        );

        return {
            redirectUrl: connectionRequest.redirectUrl ?? null,
            connectionId: connectionRequest.id,
        };
    } catch (error) {
        console.error(`[Composio] Failed to connect tool:`, error);
        throw error;
    }
}

/**
 * Check if a tool connection is complete
 */
export async function checkConnectionStatus(connectionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'active' | 'inactive';
    message?: string;
}> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        // Get connected account status
        const account = await composioClient.connectedAccounts.get(connectionId);

        // Map the status to our simplified format
        const statusMap: Record<string, 'pending' | 'completed' | 'failed' | 'active' | 'inactive'> = {
            'INITIALIZING': 'pending',
            'IN_PROGRESS': 'pending',
            'ACTIVE': 'active',
            'COMPLETED': 'completed',
            'INACTIVE': 'inactive',
            'FAILED': 'failed',
            'EXPIRED': 'inactive',
        };

        return {
            status: statusMap[account.status] || 'pending',
            message: account.status,
        };
    } catch (error) {
        console.error('[Composio] Failed to check connection:', error);
        throw error;
    }
}

/**
 * Wait for a connection to be established
 */
export async function waitForConnection(connectionId: string, timeout = 60000): Promise<{
    status: 'completed' | 'active' | 'failed' | 'timeout';
    message?: string;
}> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        const result = await composioClient.connectedAccounts.waitForConnection(connectionId, timeout);

        return {
            status: result.status === 'ACTIVE' ? 'active' : 'completed',
            message: result.status,
        };
    } catch (error) {
        console.error('[Composio] Wait for connection failed:', error);
        return { status: 'timeout', message: String(error) };
    }
}

/**
 * List all connected accounts
 */
export async function listConnectedAccounts(userId?: string): Promise<Array<{
    id: string;
    status: string;
    toolkitSlug: string;
    createdAt: string;
}>> {
    if (!composioClient) {
        throw new Error('Composio not initialized');
    }

    try {
        const response = await composioClient.connectedAccounts.list({
            userIds: userId ? [userId] : undefined,
        });

        return (response.items || []).map((account: any) => ({
            id: account.id,
            status: account.status,
            toolkitSlug: account.toolkit?.slug || '',
            createdAt: account.createdAt || '',
        }));
    } catch (error) {
        console.error('[Composio] Failed to list connected accounts:', error);
        throw error;
    }
}

/**
 * Execute a tool action via Composio
 */
export async function executeToolAction(
    toolName: string,
    params: Record<string, any>,
    connectedAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!composioClient) {
        // Try to initialize from stored connection
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (!composioConn?.api_key) {
            return { success: false, error: 'No Composio connection configured' };
        }

        initComposio(composioConn.api_key);
    }

    try {
        const result = await composioClient!.tools.execute(toolName, {
            ...params,
            connectedAccountId,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error(`[Composio] Action failed:`, error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get MCP-compatible tool definitions for all enabled tools
 */
export function getMcpToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: any;
}> {
    const tools = getConnectedTools();

    return tools.map((tool: any) => ({
        name: `composio_${tool.tool_slug}`,
        description: `Execute ${tool.tool_name} actions via Composio`,
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', description: 'The action to perform' },
                params: { type: 'object', description: 'Parameters for the action' },
            },
            required: ['action'],
        },
    }));
}

/**
 * Initialize Composio from stored credentials on app start
 */
export function initComposioFromStorage(): boolean {
    try {
        const connections = getMcpConnections();
        const composioConn = connections.find(c => c.type === 'composio' && c.is_enabled && c.api_key);

        if (composioConn?.api_key) {
            initComposio(composioConn.api_key);
            console.log('[Composio] Initialized from stored credentials');
            return true;
        }

        console.log('[Composio] No stored credentials found');
        return false;
    } catch (error) {
        console.error('[Composio] Failed to initialize from storage:', error);
        return false;
    }
}
