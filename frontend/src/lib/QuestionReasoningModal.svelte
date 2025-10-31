<script>
    import { Modal, ModalBody, ModalHeader, Badge } from "yesvelte";

    export let isOpen = false;
    export let questionNumber = 1;
    export let questionText = "";
    export let reasoning = null;

    // Debug log
    $: console.log('QuestionReasoningModal - isOpen:', isOpen);
    $: console.log('QuestionReasoningModal - reasoning:', reasoning);
    $: console.log('QuestionReasoningModal - questionNumber:', questionNumber);
    $: console.log('QuestionReasoningModal - questionText:', questionText);

    function toggle() {
        isOpen = !isOpen;
        console.log('QuestionReasoningModal toggled, isOpen:', isOpen);
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

<Modal {isOpen} {toggle} size="md">
    <ModalHeader {toggle}>
        Question {questionNumber} - AI Reasoning
    </ModalHeader>

    <ModalBody>
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
                        <Badge color={getAnswerBadgeColor(reasoning.answer)} size="lg">
                            {reasoning.answer}
                        </Badge>
                        {#if reasoning.confidence}
                            <Badge color={getConfidenceBadgeColor(reasoning.confidence)} size="lg">
                                {reasoning.confidence} confidence
                            </Badge>
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
    </ModalBody>
</Modal>

<style>
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
