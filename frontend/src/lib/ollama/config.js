/**
 * Ollama Configuration
 * Configure the Ollama endpoint and model settings
 */

export const OLLAMA_CONFIG = {
    // Mock mode for testing without Ollama (set to false to use real Ollama)
    useMockAI: false,

    // Use SvelteKit API proxy to avoid CORS issues
    useProxy: true,

    // Proxy endpoint (SvelteKit API route)
    proxyEndpoint: '/api/ollama',

    // Direct Ollama endpoint (used only if useProxy is false)
    endpoint: 'http://localhost:11434',

    // Model name (Ollama model - will be pulled automatically)
    // Using Google Gemma 3 12B IT (original HuggingFace model via Ollama)
    model: 'gemma3:12b',

    // API settings (Ollama uses OpenAI-compatible API)
    apiPath: '/v1/chat/completions',

    // Generation parameters
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,

    // Timeout in milliseconds
    timeout: 300000, // 300 seconds (5 minutes) - increased for larger models
};

/**
 * Get full API URL
 */
export function getApiUrl() {
    if (OLLAMA_CONFIG.useProxy) {
        return OLLAMA_CONFIG.proxyEndpoint;
    }
    return `${OLLAMA_CONFIG.endpoint}${OLLAMA_CONFIG.apiPath}`;
}

/**
 * Get health check URL
 */
export function getHealthCheckUrl() {
    if (OLLAMA_CONFIG.useProxy) {
        return OLLAMA_CONFIG.proxyEndpoint;
    }
    return `${OLLAMA_CONFIG.endpoint}/api/tags`;
}

/**
 * Update Ollama endpoint (useful for different environments)
 */
export function setOllamaEndpoint(endpoint) {
    OLLAMA_CONFIG.endpoint = endpoint;
}
