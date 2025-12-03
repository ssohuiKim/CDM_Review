/**
 * WebWorker for background Naranjo AI reasoning
 * This worker processes AI reasoning requests in the background to avoid blocking the UI
 */

import { getNaranjoReasoning, checkOllamaHealth } from './OllamaClient.js';

// Worker state
let isProcessing = false;
let processingQueue = [];

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event) => {
    const { type, payload, requestId } = event.data;

    try {
        switch (type) {
            case 'HEALTH_CHECK':
                await handleHealthCheck(requestId);
                break;

            case 'REQUEST_REASONING':
                await handleReasoningRequest(payload, requestId);
                break;

            case 'CANCEL_REQUEST':
                handleCancelRequest(payload.requestId);
                break;

            default:
                postMessage({
                    type: 'ERROR',
                    requestId,
                    error: `Unknown message type: ${type}`
                });
        }
    } catch (error) {
        postMessage({
            type: 'ERROR',
            requestId,
            error: error.message,
            stack: error.stack
        });
    }
});

/**
 * Handle health check request
 */
async function handleHealthCheck(requestId) {
    try {
        const isHealthy = await checkOllamaHealth();

        postMessage({
            type: 'HEALTH_CHECK_RESULT',
            requestId,
            isHealthy
        });
    } catch (error) {
        postMessage({
            type: 'HEALTH_CHECK_RESULT',
            requestId,
            isHealthy: false,
            error: error.message
        });
    }
}

/**
 * Handle reasoning request
 */
async function handleReasoningRequest(payload, requestId) {
    const { patientNo, patientData } = payload;

    // Add to queue
    processingQueue.push({ patientNo, patientData, requestId });

    // Notify that request is queued
    postMessage({
        type: 'REASONING_QUEUED',
        requestId,
        patientNo,
        queuePosition: processingQueue.length
    });

    // Process queue
    await processQueue();
}

/**
 * Handle cancel request
 */
function handleCancelRequest(targetRequestId) {
    const index = processingQueue.findIndex(item => item.requestId === targetRequestId);

    if (index !== -1) {
        processingQueue.splice(index, 1);

        postMessage({
            type: 'REASONING_CANCELLED',
            requestId: targetRequestId
        });
    }
}

/**
 * Process the reasoning queue
 */
async function processQueue() {
    // If already processing, skip
    if (isProcessing || processingQueue.length === 0) {
        return;
    }

    isProcessing = true;

    while (processingQueue.length > 0) {
        const request = processingQueue.shift();
        const { patientNo, patientData, requestId } = request;

        try {
            // Notify processing started
            postMessage({
                type: 'REASONING_STARTED',
                requestId,
                patientNo
            });

            // Call LocalAI API
            const result = await getNaranjoReasoning(patientData);

            // Send result back
            if (result.success) {
                postMessage({
                    type: 'REASONING_COMPLETED',
                    requestId,
                    patientNo,
                    data: result.data,
                    timestamp: result.timestamp
                });
            } else {
                postMessage({
                    type: 'REASONING_FAILED',
                    requestId,
                    patientNo,
                    error: result.error,
                    timestamp: result.timestamp
                });
            }

        } catch (error) {
            postMessage({
                type: 'REASONING_FAILED',
                requestId,
                patientNo,
                error: error.message
            });
        }

        // Small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    isProcessing = false;
}

/**
 * Worker initialization
 */
postMessage({
    type: 'WORKER_READY',
    timestamp: new Date().toISOString()
});
