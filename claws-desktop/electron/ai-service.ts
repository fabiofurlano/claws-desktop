
import fetch from 'node-fetch';

export interface AIRequest {
    apiKey: string;
    baseUrl: string;
    model: string;
    messages: { role: string; content: string }[];
}

export async function streamThinking(
    request: AIRequest,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (error: string) => void
) {
    try {
        const response = await fetch(`${request.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.apiKey}`,
                'HTTP-Referer': 'https://claws.ai',
                'X-Title': 'Claws Desktop',
            },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            onError(`API Error ${response.status}: ${errorText}`);
            return;
        }

        if (!response.body) {
            onError('No response body received');
            return;
        }

        // @ts-ignore
        let buffer = '';
        for await (const chunk of response.body) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') continue;
                if (!line.startsWith('data: ')) continue;

                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices && data.choices[0]?.delta?.content) {
                        onChunk(data.choices[0].delta.content);
                    }
                } catch (e) {
                    console.error('Error parsing chunk:', e);
                }
            }
        }

        // Process any remaining buffer if it's a complete line (unlikely but possible)
        if (buffer.trim() && buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
            try {
                const data = JSON.parse(buffer.slice(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                    onChunk(data.choices[0].delta.content);
                }
            } catch (e) { }
        }

        onDone();

    } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
    }
}
