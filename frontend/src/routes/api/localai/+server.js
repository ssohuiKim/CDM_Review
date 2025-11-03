/**
 * SvelteKit API Proxy for LocalAI
 * This endpoint proxies requests to LocalAI to avoid CORS issues
 */

import { json, error } from '@sveltejs/kit';

// LocalAI configuration (llama.cpp server)
// In Docker: use service name 'llamacpp', in local dev: use 'localhost'
const LOCALAI_ENDPOINT = process.env.LOCALAI_ENDPOINT || 'http://llamacpp:7800';
const LOCALAI_MODEL = process.env.LOCALAI_MODEL || '/models/mistral-7b-instruct-v0.2.Q4_K_M.gguf';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        // Parse the request body
        const body = await request.json();

        // Validate request
        if (!body.messages || !Array.isArray(body.messages)) {
            throw error(400, 'Invalid request: messages array is required');
        }

        // Prepare request to LocalAI
        const localAIRequest = {
            model: body.model || LOCALAI_MODEL,
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

        // Forward request to LocalAI
        const localAIResponse = await fetch(`${LOCALAI_ENDPOINT}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(localAIRequest),
            signal: AbortSignal.timeout(120000) // 2 minute timeout
        });

        if (!localAIResponse.ok) {
            const errorText = await localAIResponse.text();
            console.error('LocalAI error:', errorText);
            throw error(localAIResponse.status, `LocalAI error: ${errorText}`);
        }

        // Return LocalAI response
        const result = await localAIResponse.json();
        return json(result);

    } catch (err) {
        console.error('Proxy error:', err);

        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
            throw error(504, 'LocalAI request timeout');
        }

        if (err.cause?.code === 'ECONNREFUSED') {
            throw error(503, 'LocalAI service is not available. Please ensure LocalAI is running.');
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
        // Health check endpoint
        const response = await fetch(`${LOCALAI_ENDPOINT}/v1/models`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw error(503, 'LocalAI service is not responding');
        }

        const models = await response.json();

        return json({
            status: 'ok',
            endpoint: LOCALAI_ENDPOINT,
            models: models
        });

    } catch (err) {
        console.error('Health check error:', err);

        if (err.cause?.code === 'ECONNREFUSED') {
            return json({
                status: 'error',
                message: 'LocalAI service is not available',
                endpoint: LOCALAI_ENDPOINT
            }, { status: 503 });
        }

        throw error(503, 'LocalAI health check failed');
    }
}
