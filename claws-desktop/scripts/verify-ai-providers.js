const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (!fs.existsSync(envPath)) {
            console.log(`${colors.yellow}Warning: .env file not found at ${envPath}${colors.reset}`);
            return {};
        }
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (key && !key.startsWith('#')) {
                    env[key] = value;
                }
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env:', e);
        return {};
    }
}

const env = loadEnv();

const PROVIDERS = [
    {
        name: 'Z.AI (GLM Coding)',
        apiKey: env.ZAI_API_KEY,
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        model: 'glm-4.7', // Must be lowercase!
        headers: {
            'HTTP-Referer': 'https://claws.ai',
            'X-Title': 'Claws Desktop',
        }
    },
    {
        name: 'OpenRouter',
        apiKey: env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
        headers: {
            'HTTP-Referer': 'https://claws.ai',
            'X-Title': 'Claws Desktop',
        }
    }
];

async function testProvider(provider) {
    console.log(`${colors.bold}Testing ${provider.name}...${colors.reset}`);

    if (!provider.apiKey) {
        console.log(`${colors.red}❌ Skipped: No API Key found in .env${colors.reset}\n`);
        return;
    }

    const url = new URL(`${provider.baseUrl}/chat/completions`);
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
            ...provider.headers
        }
    };

    const body = JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: 'Say "Hello, World!"' }],
        stream: false // Test non-streaming for simplicity in auth check
    });

    return new Promise((resolve) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.message?.content;
                        console.log(`${colors.green}✅ Success!${colors.reset}`);
                        console.log(`   Response: "${content ? content.trim() : 'No content'}"`);
                        console.log(`   Model: ${parsed.model || 'Unknown'}\n`);
                        resolve(true);
                    } catch (e) {
                        console.log(`${colors.red}❌ Failed to parse response: ${e.message}${colors.reset}`);
                        console.log(`   Raw output: ${data.substring(0, 100)}...\n`);
                        resolve(false);
                    }
                } else {
                    console.log(`${colors.red}❌ Failed (Status: ${res.statusCode})${colors.reset}`);
                    console.log(`   Error: ${data}\n`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`${colors.red}❌ Network Error: ${e.message}${colors.reset}\n`);
            resolve(false);
        });

        req.write(body);
        req.end();
    });
}

async function runEvaluations() {
    console.log(`${colors.bold}Starting AI Provider Verification...${colors.reset}\n`);

    for (const provider of PROVIDERS) {
        await testProvider(provider);
    }

    console.log(`${colors.bold}Verification Complete.${colors.reset}`);
}

runEvaluations();
