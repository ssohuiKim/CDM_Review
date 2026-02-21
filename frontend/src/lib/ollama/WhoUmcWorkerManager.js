/**
 * WHO-UMC Worker Manager
 * Completely independent from Naranjo - separate stores, separate localStorage
 */

import { writable } from 'svelte/store';

// Independent stores (not shared with Naranjo)
export const whoUmcWorkerStatus = writable('idle');
export const whoUmcReasoningStatus = writable({});
export const whoUmcReasoningResults = writable({});

class WhoUmcWorkerManager {
    constructor() {
        this.worker = null;
        this.requestCallbacks = new Map();
        this.requestIdCounter = 0;
        this.isReady = false;
    }

    async initialize() {
        if (this.worker) {
            console.warn('WHO-UMC Worker already initialized');
            return;
        }

        try {
            whoUmcWorkerStatus.set('initializing');

            this.worker = new Worker(
                new URL('./whoUmc.worker.js', import.meta.url),
                { type: 'module' }
            );

            this.worker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event.data);
            });

            this.worker.addEventListener('error', (error) => {
                console.error('WHO-UMC Worker error:', error);
                whoUmcWorkerStatus.set('error');
            });

            await this.waitForWorkerReady();

            const isHealthy = await this.checkHealth();

            if (isHealthy) {
                whoUmcWorkerStatus.set('ready');
                this.isReady = true;
                console.log('WhoUmcWorkerManager initialized successfully');
            } else {
                whoUmcWorkerStatus.set('error');
                console.error('LocalAI service is not available for WHO-UMC');
            }

        } catch (error) {
            console.error('Failed to initialize WHO-UMC worker:', error);
            whoUmcWorkerStatus.set('error');
            throw error;
        }
    }

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

    handleWorkerMessage(message) {
        const { type, requestId, patientNo } = message;

        switch (type) {
            case 'WORKER_READY':
                console.log('WHO-UMC Worker is ready');
                break;

            case 'HEALTH_CHECK_RESULT':
                this.resolveRequest(requestId, message);
                break;

            case 'REASONING_QUEUED':
                whoUmcReasoningStatus.update(state => ({ ...state, [patientNo]: 'queued' }));
                break;

            case 'REASONING_STARTED':
                whoUmcReasoningStatus.update(state => ({ ...state, [patientNo]: 'processing' }));
                break;

            case 'REASONING_COMPLETED':
                whoUmcReasoningStatus.update(state => ({ ...state, [patientNo]: 'completed' }));
                whoUmcReasoningResults.update(state => ({ ...state, [patientNo]: message.data }));
                this.resolveRequest(requestId, message);
                this.saveToLocalStorage(patientNo, message.data);
                break;

            case 'REASONING_FAILED':
                whoUmcReasoningStatus.update(state => ({ ...state, [patientNo]: 'failed' }));
                this.resolveRequest(requestId, { error: message.error });
                break;

            case 'REASONING_CANCELLED':
                this.resolveRequest(requestId, { cancelled: true });
                break;

            case 'ERROR':
                console.error('WHO-UMC Worker error:', message.error);
                this.rejectRequest(requestId, new Error(message.error));
                break;

            default:
                console.warn('Unknown message type from WHO-UMC worker:', type);
        }
    }

    async checkHealth() {
        const requestId = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.requestCallbacks.set(requestId, { resolve, reject });

            this.worker.postMessage({
                type: 'HEALTH_CHECK',
                requestId
            });

            setTimeout(() => {
                if (this.requestCallbacks.has(requestId)) {
                    this.requestCallbacks.delete(requestId);
                    resolve(false);
                }
            }, 10000);
        }).then(result => result.isHealthy);
    }

    async requestReasoning(patientNo, patientData) {
        if (!this.isReady) {
            throw new Error('WHO-UMC Worker is not ready. Call initialize() first.');
        }

        const requestId = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.requestCallbacks.set(requestId, { resolve, reject });

            this.worker.postMessage({
                type: 'REQUEST_REASONING',
                requestId,
                payload: { patientNo, patientData }
            });

            setTimeout(() => {
                if (this.requestCallbacks.has(requestId)) {
                    this.requestCallbacks.delete(requestId);
                    reject(new Error('WHO-UMC request timeout'));
                }
            }, 120000);
        });
    }

    saveToLocalStorage(patientNo, reasoning) {
        try {
            const key = 'whoUmcAIReasoning';
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            stored[patientNo] = { reasoning, timestamp: new Date().toISOString() };
            localStorage.setItem(key, JSON.stringify(stored));
        } catch (error) {
            console.error('Failed to save WHO-UMC reasoning:', error);
        }
    }

    loadFromLocalStorage(patientNo) {
        try {
            const key = 'whoUmcAIReasoning';
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            return stored[patientNo]?.reasoning || null;
        } catch (error) {
            console.error('Failed to load WHO-UMC reasoning:', error);
            return null;
        }
    }

    generateRequestId() {
        return `whoumc_${this.requestIdCounter++}_${Date.now()}`;
    }

    resolveRequest(requestId, result) {
        const callback = this.requestCallbacks.get(requestId);
        if (callback) {
            callback.resolve(result);
            this.requestCallbacks.delete(requestId);
        }
    }

    rejectRequest(requestId, error) {
        const callback = this.requestCallbacks.get(requestId);
        if (callback) {
            callback.reject(error);
            this.requestCallbacks.delete(requestId);
        }
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            whoUmcWorkerStatus.set('idle');
            console.log('WHO-UMC Worker terminated');
        }
    }
}

export const whoUmcWorkerManager = new WhoUmcWorkerManager();
