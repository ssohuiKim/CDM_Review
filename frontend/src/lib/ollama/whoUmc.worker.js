/**
 * WebWorker for background WHO-UMC AI reasoning
 * Completely independent from Naranjo worker
 */

import { getWhoUmcReasoning, checkOllamaHealth } from './WhoUmcClient.js';

let isProcessing = false;
let processingQueue = [];

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
            error: error.message
        });
    }
});

async function handleHealthCheck(requestId) {
    try {
        const isHealthy = await checkOllamaHealth();
        postMessage({ type: 'HEALTH_CHECK_RESULT', requestId, isHealthy });
    } catch (error) {
        postMessage({ type: 'HEALTH_CHECK_RESULT', requestId, isHealthy: false, error: error.message });
    }
}

async function handleReasoningRequest(payload, requestId) {
    const { patientNo, patientData } = payload;

    processingQueue.push({ patientNo, patientData, requestId });

    postMessage({
        type: 'REASONING_QUEUED',
        requestId,
        patientNo,
        queuePosition: processingQueue.length
    });

    await processQueue();
}

function handleCancelRequest(targetRequestId) {
    const index = processingQueue.findIndex(item => item.requestId === targetRequestId);
    if (index !== -1) {
        processingQueue.splice(index, 1);
        postMessage({ type: 'REASONING_CANCELLED', requestId: targetRequestId });
    }
}

async function processQueue() {
    if (isProcessing || processingQueue.length === 0) return;

    isProcessing = true;

    while (processingQueue.length > 0) {
        const request = processingQueue.shift();
        const { patientNo, patientData, requestId } = request;

        try {
            postMessage({ type: 'REASONING_STARTED', requestId, patientNo });

            const result = await getWhoUmcReasoning(patientData);

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
                    error: result.error
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

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    isProcessing = false;
}

postMessage({
    type: 'WORKER_READY',
    timestamp: new Date().toISOString()
});
