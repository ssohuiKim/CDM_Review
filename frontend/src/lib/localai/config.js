/**
 * LocalAI Configuration
 * Configure the LocalAI endpoint and model settings
 */

export const LOCALAI_CONFIG = {
    // Mock mode for testing without LocalAI (set to false to use real LocalAI)
    useMockAI: false,

    // Use SvelteKit API proxy to avoid CORS issues
    useProxy: true,

    // Proxy endpoint (SvelteKit API route)
    proxyEndpoint: '/api/localai',

    // Direct LocalAI endpoint (used only if useProxy is false)
    endpoint: 'http://localhost:8080',

    // Model name (should match the model loaded in LocalAI)
    // AIO image uses 'gpt-4' as an alias for the bundled model
    model: 'gpt-4',

    // API settings
    apiPath: '/v1/chat/completions',

    // Generation parameters
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,

    // Timeout in milliseconds
    timeout: 120000, // 120 seconds (2 minutes)
};

/**
 * Get full API URL
 */
export function getApiUrl() {
    if (LOCALAI_CONFIG.useProxy) {
        return LOCALAI_CONFIG.proxyEndpoint;
    }
    return `${LOCALAI_CONFIG.endpoint}${LOCALAI_CONFIG.apiPath}`;
}

/**
 * Get health check URL
 */
export function getHealthCheckUrl() {
    if (LOCALAI_CONFIG.useProxy) {
        return LOCALAI_CONFIG.proxyEndpoint;
    }
    return `${LOCALAI_CONFIG.endpoint}/v1/models`;
}

/**
 * Update LocalAI endpoint (useful for different environments)
 */
export function setLocalAIEndpoint(endpoint) {
    LOCALAI_CONFIG.endpoint = endpoint;
}
