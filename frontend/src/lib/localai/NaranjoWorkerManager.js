/**
 * Naranjo Worker Manager
 * Manages WebWorker communication for background AI reasoning
 */

import { writable } from 'svelte/store';

// Stores for worker state
export const workerStatus = writable('idle'); // idle, initializing, ready, error
export const reasoningStatus = writable({}); // { [patientNo]: 'pending' | 'processing' | 'completed' | 'failed' }
export const reasoningResults = writable({}); // { [patientNo]: result }
export const queueStatus = writable([]); // Array of patient numbers in queue

class NaranjoWorkerManager {
    constructor() {
        this.worker = null;
        this.requestCallbacks = new Map();
        this.requestIdCounter = 0;
        this.isReady = false;
    }

    /**
     * Initialize the worker
     */
    async initialize() {
        if (this.worker) {
            console.warn('Worker already initialized');
            return;
        }

        try {
            workerStatus.set('initializing');

            // Create worker
            this.worker = new Worker(
                new URL('./naranjo.worker.js', import.meta.url),
                { type: 'module' }
            );

            // Set up message handler
            this.worker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event.data);
            });

            // Set up error handler
            this.worker.addEventListener('error', (error) => {
                console.error('Worker error:', error);
                workerStatus.set('error');
            });

            // Wait for worker ready
            await this.waitForWorkerReady();

            // Check LocalAI health
            const isHealthy = await this.checkHealth();

            if (isHealthy) {
                workerStatus.set('ready');
                this.isReady = true;
                console.log('NaranjoWorkerManager initialized successfully');
            } else {
                workerStatus.set('error');
                console.error('LocalAI service is not available');
            }

        } catch (error) {
            console.error('Failed to initialize worker:', error);
            workerStatus.set('error');
            throw error;
        }
    }

    /**
     * Wait for worker ready message
     */
    async waitForWorkerReady() {
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.data.type === 'WORKER_READY') {
                    this.worker.removeEventListener('message', handler);
                    resolve();
                }
            };
            this.worker.addEventListener('message', handler);
        });
    }

    /**
     * Handle messages from worker
     */
    handleWorkerMessage(message) {
        const { type, requestId, patientNo } = message;

        switch (type) {
            case 'WORKER_READY':
                console.log('Worker is ready');
                break;

            case 'HEALTH_CHECK_RESULT':
                this.resolveRequest(requestId, message);
                break;

            case 'REASONING_QUEUED':
                reasoningStatus.update(state => ({
                    ...state,
                    [patientNo]: 'queued'
                }));
                break;

            case 'REASONING_STARTED':
                reasoningStatus.update(state => ({
                    ...state,
                    [patientNo]: 'processing'
                }));
                break;

            case 'REASONING_COMPLETED':
                reasoningStatus.update(state => ({
                    ...state,
                    [patientNo]: 'completed'
                }));
                reasoningResults.update(state => ({
                    ...state,
                    [patientNo]: message.data
                }));
                this.resolveRequest(requestId, message);
                this.saveToLocalStorage(patientNo, message.data);
                break;

            case 'REASONING_FAILED':
                reasoningStatus.update(state => ({
                    ...state,
                    [patientNo]: 'failed'
                }));
                this.resolveRequest(requestId, { error: message.error });
                break;

            case 'REASONING_CANCELLED':
                this.resolveRequest(requestId, { cancelled: true });
                break;

            case 'ERROR':
                console.error('Worker error:', message.error);
                this.rejectRequest(requestId, new Error(message.error));
                break;

            default:
                console.warn('Unknown message type from worker:', type);
        }
    }

    /**
     * Check LocalAI health
     */
    async checkHealth() {
        const requestId = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.requestCallbacks.set(requestId, { resolve, reject });

            this.worker.postMessage({
                type: 'HEALTH_CHECK',
                requestId
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.requestCallbacks.has(requestId)) {
                    this.requestCallbacks.delete(requestId);
                    resolve(false);
                }
            }, 10000);
        }).then(result => result.isHealthy);
    }

    /**
     * Request reasoning for a patient
     */
    async requestReasoning(patientNo, patientData) {
        if (!this.isReady) {
            throw new Error('Worker is not ready. Call initialize() first.');
        }

        const requestId = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.requestCallbacks.set(requestId, { resolve, reject });

            this.worker.postMessage({
                type: 'REQUEST_REASONING',
                requestId,
                payload: {
                    patientNo,
                    patientData
                }
            });

            // Timeout after 2 minutes
            setTimeout(() => {
                if (this.requestCallbacks.has(requestId)) {
                    this.requestCallbacks.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 120000);
        });
    }

    /**
     * Request reasoning for multiple patients
     */
    async requestBatchReasoning(patients) {
        const promises = patients.map(({ patientNo, patientData }) =>
            this.requestReasoning(patientNo, patientData)
                .catch(error => ({
                    patientNo,
                    error: error.message
                }))
        );

        return Promise.all(promises);
    }

    /**
     * Cancel a reasoning request
     */
    cancelRequest(requestId) {
        this.worker.postMessage({
            type: 'CANCEL_REQUEST',
            payload: { requestId }
        });
    }

    /**
     * Save reasoning to localStorage
     */
    saveToLocalStorage(patientNo, reasoning) {
        try {
            const key = 'naranjoAIReasoning';
            const stored = JSON.parse(localStorage.getItem(key) || '{}');

            stored[patientNo] = {
                reasoning,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(key, JSON.stringify(stored));
        } catch (error) {
            console.error('Failed to save reasoning to localStorage:', error);
        }
    }

    /**
     * Load reasoning from localStorage
     */
    loadFromLocalStorage(patientNo) {
        try {
            const key = 'naranjoAIReasoning';
            const stored = JSON.parse(localStorage.getItem(key) || '{}');

            return stored[patientNo]?.reasoning || null;
        } catch (error) {
            console.error('Failed to load reasoning from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear all reasoning data
     */
    clearAllReasoning() {
        try {
            localStorage.removeItem('naranjoAIReasoning');
            reasoningResults.set({});
            reasoningStatus.set({});
        } catch (error) {
            console.error('Failed to clear reasoning data:', error);
        }
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${this.requestIdCounter++}_${Date.now()}`;
    }

    /**
     * Resolve a request callback
     */
    resolveRequest(requestId, result) {
        const callback = this.requestCallbacks.get(requestId);
        if (callback) {
            callback.resolve(result);
            this.requestCallbacks.delete(requestId);
        }
    }

    /**
     * Reject a request callback
     */
    rejectRequest(requestId, error) {
        const callback = this.requestCallbacks.get(requestId);
        if (callback) {
            callback.reject(error);
            this.requestCallbacks.delete(requestId);
        }
    }

    /**
     * Terminate the worker
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            workerStatus.set('idle');
            console.log('Worker terminated');
        }
    }
}

// Export singleton instance
export const naranjoWorkerManager = new NaranjoWorkerManager();
