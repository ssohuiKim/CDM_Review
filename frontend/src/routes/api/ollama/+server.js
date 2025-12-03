/**
 * SvelteKit API Proxy for Ollama
 * This endpoint proxies requests to Ollama to avoid CORS issues
 */

import { json, error } from '@sveltejs/kit';

// Ollama configuration
// In Docker: use service name 'ollama', in local dev: use 'localhost'
// Check if running in production (Docker) or development (local)
const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true';
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || (isDocker ? 'http://ollama:11434' : 'http://localhost:11434');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        // Parse the request body
        const body = await request.json();

        // Validate request
        if (!body.messages || !Array.isArray(body.messages)) {
            throw error(400, 'Invalid request: messages array is required');
        }

        // Prepare request to Ollama
        const ollamaRequest = {
            model: body.model || OLLAMA_MODEL,
            messages: body.messages,
            temperature: body.temperature || 0.7,
            max_tokens: body.max_tokens || 2000,
            top_p: body.top_p || 0.95
        };

        // Log the prompt for debugging
        console.log('=== AI Request ===');
        console.log('System:', body.messages[0]?.content?.substring(0, 200));
        console.log('User Prompt:', body.messages[1]?.content);
        console.log('==================');

        // Forward request to Ollama (OpenAI-compatible API)
        const ollamaResponse = await fetch(`${OLLAMA_ENDPOINT}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ollamaRequest),
            signal: AbortSignal.timeout(300000) // 5 minute timeout for larger models
        });

        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            console.error('Ollama error:', errorText);
            throw error(ollamaResponse.status, `Ollama error: ${errorText}`);
        }

        // Return Ollama response
        const result = await ollamaResponse.json();
        return json(result);

    } catch (err) {
        console.error('Proxy error:', err);

        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
            throw error(504, 'Ollama request timeout');
        }

        if (err.cause?.code === 'ECONNREFUSED') {
            throw error(503, 'Ollama service is not available. Please ensure Ollama is running.');
        }

        // Re-throw SvelteKit errors
        if (err.status) {
            throw err;
        }

        throw error(500, `Proxy error: ${err.message}`);
    }
}

/** @type {import('./$types').RequestHandler} */
export async function GET() {
    try {
        // Health check endpoint - Ollama uses /api/tags for listing models
        const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw error(503, 'Ollama service is not responding');
        }

        const models = await response.json();

        return json({
            status: 'ok',
            endpoint: OLLAMA_ENDPOINT,
            models: models
        });

    } catch (err) {
        console.error('Health check error:', err);

        if (err.cause?.code === 'ECONNREFUSED') {
            return json({
                status: 'error',
                message: 'Ollama service is not available',
                endpoint: OLLAMA_ENDPOINT
            }, { status: 503 });
        }

        throw error(503, 'Ollama health check failed');
    }
}
