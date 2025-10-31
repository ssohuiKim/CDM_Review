<script>
    export let isOpen = false;
    export let questionNumber = 1;
    export let questionText = "";
    export let reasoning = null;

    function close() {
        isOpen = false;
    }

    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            close();
        }
    }

    function getConfidenceBadgeClass(confidence) {
        switch (confidence?.toLowerCase()) {
            case 'high': return 'badge-success';
            case 'medium': return 'badge-warning';
            case 'low': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }

    function getAnswerBadgeClass(answer) {
        switch (answer?.toLowerCase()) {
            case 'yes': return 'badge-primary';
            case 'no': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }
</script>

{#if isOpen}
    <div class="modal-backdrop" on:click={handleBackdropClick}>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Question {questionNumber} - AI Reasoning</h5>
                    <button type="button" class="close-button" on:click={close}>×</button>
                </div>

                <div class="modal-body">
                    {#if reasoning}
                        <div class="reasoning-content">
                            <!-- Question Text -->
                            <div class="question-section">
                                <h6>Question:</h6>
                                <p class="question-text">{questionText}</p>
                            </div>

                            <!-- AI Answer -->
                            <div class="answer-section">
                                <h6>AI Answer:</h6>
                                <div class="badges">
                                    <span class="badge {getAnswerBadgeClass(reasoning.answer)}">
                                        {reasoning.answer}
                                    </span>
                                    {#if reasoning.confidence}
                                        <span class="badge {getConfidenceBadgeClass(reasoning.confidence)}">
                                            {reasoning.confidence} confidence
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Reasoning -->
                            <div class="reasoning-section">
                                <h6>Clinical Reasoning:</h6>
                                <p class="reasoning-text">{reasoning.reasoning}</p>
                            </div>

                            <!-- Additional Info -->
                            {#if reasoning.confidence === 'Low'}
                                <div class="info-box">
                                    <strong>Note:</strong> Low confidence indicates insufficient data to make a definitive assessment.
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="no-reasoning">
                            <p>No AI reasoning available for this question.</p>
                            <p class="hint">Click "Analyze with AI" to generate AI reasoning.</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .modal-dialog {
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #dee2e6;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
    }

    .modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #212529;
    }

    .close-button {
        background: none;
        border: none;
        font-size: 32px;
        line-height: 1;
        color: #6c757d;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .close-button:hover {
        background: #e9ecef;
        color: #212529;
    }

    .modal-body {
        padding: 20px;
    }

    .reasoning-content {
        padding: 4px 0;
    }

    .question-section,
    .answer-section,
    .reasoning-section {
        margin-bottom: 20px;
    }

    h6 {
        font-size: 14px;
        font-weight: 700;
        color: #495057;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .question-text {
        font-size: 15px;
        line-height: 1.6;
        color: #212529;
        margin: 0;
        padding: 12px;
        background: #f8f9fa;
        border-left: 3px solid #0d6efd;
        border-radius: 4px;
    }

    .badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .badge {
        display: inline-block;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 4px;
        color: white;
    }

    .badge-primary {
        background: #0d6efd;
    }

    .badge-success {
        background: #28a745;
    }

    .badge-warning {
        background: #ffc107;
        color: #212529;
    }

    .badge-danger {
        background: #dc3545;
    }

    .badge-secondary {
        background: #6c757d;
    }

    .reasoning-text {
        font-size: 14px;
        line-height: 1.7;
        color: #495057;
        margin: 0;
        padding: 12px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 4px;
    }

    .no-reasoning {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }

    .no-reasoning p {
        margin: 8px 0;
    }

    .hint {
        font-size: 13px;
        color: #adb5bd;
    }

    .info-box {
        padding: 12px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        font-size: 13px;
        color: #856404;
    }
</style>
