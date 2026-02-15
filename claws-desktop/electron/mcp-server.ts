import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getMemoryStats } from './database.js';
import { initComposioFromStorage, getMcpToolDefinitions, executeToolAction, getComposio } from './composio-service.js';

const MCP_PORT = 3001;

let mcpServer: McpServer | null = null;
let transport: StreamableHTTPServerTransport | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

/**
 * Start the MCP server.
 * Called from main.ts when app is ready.
 */
export async function startMcpServer(): Promise<void> {
    if (mcpServer) {
        console.log('[MCP] Server already running');
        return;
    }

    try {
        // Create MCP server instance
        mcpServer = new McpServer({
            name: 'claws-desktop',
            version: '0.1.0',
        });

        // Initialize Composio from stored credentials
        initComposioFromStorage();

        // Register tools (will be added in Task 3)
        registerTools(mcpServer);

        // Create Streamable HTTP transport (stateless mode for simplicity)
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
        });

        // Connect MCP server to transport
        await mcpServer.connect(transport);

        // Create HTTP server and handle requests
        httpServer = createServer(async (req, res) => {
            if (transport) {
                // Capture body for POST requests
                let body: unknown = undefined;
                if (req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    for await (const chunk of req) {
                        chunks.push(chunk);
                    }
                    const rawBody = Buffer.concat(chunks).toString();
                    if (rawBody) {
                        try {
                            body = JSON.parse(rawBody);
                        } catch {
                            // body remains undefined
                        }
                    }
                }
                await transport.handleRequest(req, res, body);
            } else {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'MCP server not ready' }));
            }
        });

        // Start HTTP server
        await new Promise<void>((resolve) => {
            httpServer!.listen(MCP_PORT, '127.0.0.1', () => {
                console.log(`[MCP] Server started on http://127.0.0.1:${MCP_PORT}`);
                resolve();
            });
        });

    } catch (error) {
        console.error('[MCP] Failed to start:', error);
        throw error;
    }
}

/**
 * Stop the MCP server gracefully.
 * Called on app quit.
 */
export async function stopMcpServer(): Promise<void> {
    try {
        if (httpServer) {
            await new Promise<void>((resolve) => {
                httpServer!.close(() => {
                    console.log('[MCP] HTTP server closed');
                    resolve();
                });
            });
            httpServer = null;
        }
        if (mcpServer) {
            await mcpServer.close();
            mcpServer = null;
            transport = null;
            console.log('[MCP] Server stopped');
        }
    } catch (error) {
        console.error('[MCP] Error stopping server:', error);
    }
}

/**
 * Check if MCP server is running.
 */
export function isMcpRunning(): boolean {
    return mcpServer !== null && httpServer !== null;
}

/**
 * Register Composio tools as MCP tools.
 * These are dynamic tools based on connected services.
 */
function registerComposioTools(server: McpServer): void {
    try {
        const composioClient = getComposio();

        if (!composioClient) {
            console.log('[MCP] No Composio client - skipping Composio tool registration');
            return;
        }

        // Get tool definitions from our database
        const toolDefs = getMcpToolDefinitions();

        if (toolDefs.length === 0) {
            console.log('[MCP] No Composio tools configured in database');
            return;
        }

        toolDefs.forEach((def) => {
            server.registerTool(
                def.name,
                {
                    title: def.name,
                    description: def.description,
                    inputSchema: {
                        action: z.string().describe('The action to perform'),
                        params: z.record(z.string(), z.unknown()).optional().describe('Parameters for the action'),
                    },
                },
                async (params: { action: string; params?: Record<string, any> }) => {
                    const result = await executeToolAction(
                        def.name.replace('composio_', ''),
                        params.params || {},
                        undefined
                    );

                    if (result.success) {
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
                        };
                    } else {
                        return {
                            content: [{ type: 'text', text: `Error: ${result.error}` }],
                            isError: true,
                        };
                    }
                }
            );
        });

        console.log(`[MCP] Registered ${toolDefs.length} Composio tools`);
    } catch (error) {
        console.error('[MCP] Failed to register Composio tools:', error);
    }
}

/**
 * Register all MCP tools.
 */
function registerTools(server: McpServer): void {
    const projectRoot = path.resolve(__dirname, '..', '..');

    // Tool: Read recent git commits
    server.registerTool(
        'read_git_log',
        {
            title: 'Read Git Log',
            description: 'Get recent git commits from the Claws Desktop project',
            inputSchema: {
                limit: z.number().optional().default(10).describe('Number of commits to return'),
            },
        },
        async ({ limit }) => {
            try {
                const log = execSync(
                    `git log --oneline -${limit ?? 10} --pretty=format:"%h %s (%cr)"`,
                    { cwd: projectRoot, encoding: 'utf-8' }
                );
                return {
                    content: [{ type: 'text', text: log }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    // Tool: Read a project file
    server.registerTool(
        'read_file',
        {
            title: 'Read File',
            description: 'Read a file from the Claws Desktop project',
            inputSchema: {
                path: z.string().describe('Relative path from project root (e.g., "electron/main.ts")'),
            },
        },
        async ({ path: filePath }) => {
            try {
                const fullPath = path.join(projectRoot, filePath);

                // Security: don't allow reading outside project
                if (!fullPath.startsWith(projectRoot)) {
                    return {
                        content: [{ type: 'text', text: 'Error: Access denied - path outside project' }],
                        isError: true,
                    };
                }

                if (!fs.existsSync(fullPath)) {
                    return {
                        content: [{ type: 'text', text: `Error: File not found: ${filePath}` }],
                        isError: true,
                    };
                }

                const content = fs.readFileSync(fullPath, 'utf-8');
                return {
                    content: [{ type: 'text', text: content }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    // Tool: Get SQLite memory stats
    server.registerTool(
        'get_memory_stats',
        {
            title: 'Get Memory Stats',
            description: 'Get memory statistics from the SQLite database',
            inputSchema: {},
        },
        async () => {
            try {
                const stats = getMemoryStats();
                return {
                    content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error}` }],
                    isError: true,
                };
            }
        }
    );

    // Tool: Run Claude Code (stub for Phase 3)
    server.registerTool(
        'run_claude_code',
        {
            title: 'Run Claude Code',
            description: 'Execute Claude Code with a prompt (stub - returns placeholder for now)',
            inputSchema: {
                prompt: z.string().describe('The prompt to send to Claude Code'),
            },
        },
        async ({ prompt }) => {
            // Phase 3 will implement actual Claude Code execution
            return {
                content: [{
                    type: 'text',
                    text: `Claude Code execution requested with prompt: "${prompt}"\n\nNote: Actual execution will be implemented in Phase 3.`
                }],
            };
        }
    );

    console.log('[MCP] Registered 4 tools: read_git_log, read_file, get_memory_stats, run_claude_code');

    // Register Composio tools (if configured)
    registerComposioTools(server);
}
