<script>
    import { Modal, ModalBody, ModalHeader, Badge } from "yesvelte";

    export let isOpen = false;
    export let reasoning = null;
    export let patientNo = "";

    function toggle() {
        isOpen = !isOpen;
    }

    function getConfidenceBadgeColor(confidence) {
        switch (confidence?.toLowerCase()) {
            case 'high': return 'success';
            case 'medium': return 'warning';
            case 'low': return 'danger';
            default: return 'secondary';
        }
    }

    function getAnswerBadgeColor(answer) {
        switch (answer?.toLowerCase()) {
            case 'yes': return 'primary';
            case 'no': return 'danger';
            default: return 'secondary';
        }
    }
</script>

{#if isOpen}
<Modal open={true} isOpen={true} {toggle} size="lg">
    <ModalHeader {toggle}>
        AI Reasoning for Patient {patientNo}
    </ModalHeader>

    <ModalBody>
        {#if reasoning && reasoning.answers}
            <div class="reasoning-container">
                <!-- Overall Assessment -->
                {#if reasoning.overallAssessment}
                    <div class="overall-assessment">
                        <h5>Overall Assessment</h5>
                        <p>{reasoning.overallAssessment}</p>
                    </div>
                {/if}

                <!-- Individual Question Reasoning -->
                <div class="questions-reasoning">
                    <h5>Question-by-Question Analysis</h5>
                    {#each reasoning.answers as item, index}
                        <div class="reasoning-item">
                            <div class="question-header">
                                <span class="question-number">Q{item.question}</span>
                                <div class="badges">
                                    <Badge color={getAnswerBadgeColor(item.answer)}>
                                        {item.answer}
                                    </Badge>
                                    {#if item.confidence}
                                        <Badge color={getConfidenceBadgeColor(item.confidence)}>
                                            {item.confidence} confidence
                                        </Badge>
                                    {/if}
                                </div>
                            </div>
                            <div class="reasoning-text">
                                {item.reasoning}
                            </div>
                        </div>
                    {/each}
                </div>

                {#if reasoning.parseError}
                    <div class="error-message">
                        <strong>Note:</strong> There was an issue parsing the AI response.
                        Some information may be incomplete.
                    </div>
                {/if}
            </div>
        {:else}
            <div class="no-reasoning">
                <p>No AI reasoning available for this patient.</p>
            </div>
        {/if}
    </ModalBody>
</Modal>
{/if}

<style>
    .reasoning-container {
        padding: 8px;
    }

    .overall-assessment {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        border-left: 4px solid #0d6efd;
    }

    .overall-assessment h5 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #0d6efd;
    }

    .overall-assessment p {
        margin: 0;
        line-height: 1.6;
        color: #495057;
    }

    .questions-reasoning h5 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #212529;
    }

    .reasoning-item {
        margin-bottom: 20px;
        padding: 16px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        transition: box-shadow 0.2s;
    }

    .reasoning-item:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .question-number {
        font-weight: 700;
        font-size: 14px;
        color: #495057;
        background: #e9ecef;
        padding: 4px 12px;
        border-radius: 4px;
    }

    .badges {
        display: flex;
        gap: 8px;
    }

    .reasoning-text {
        line-height: 1.6;
        color: #495057;
        font-size: 14px;
    }

    .no-reasoning {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }

    .error-message {
        margin-top: 20px;
        padding: 12px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        color: #856404;
        font-size: 14px;
    }
</style>
