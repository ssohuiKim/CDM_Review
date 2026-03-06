<script>
    import { Checkbox, Card, CardBody, Fieldset, FormTextarea, Button } from "yesvelte";
    import { onMount, onDestroy } from "svelte";
    import { whoUmcWorkerManager, whoUmcWorkerStatus, whoUmcReasoningStatus, whoUmcReasoningResults } from "./ollama/WhoUmcWorkerManager.js";
    import QuestionReasoningModal from "./QuestionReasoningModal.svelte";
    import { drugClassification, chartComputedData } from "./duckdb.js";

    export let selectedPatient;
    export let patientData;

    let noteValue = "";
    let showSaveMessage = false;

    // AI Reasoning state (independent from Naranjo)
    let aiReasoning = null;
    let showQuestionModal = false;
    let selectedQuestionIndex = 0;
    let isWorkerReady = false;
    let currentReasoningStatus = 'idle';
    let aiSelectedAnswers = {};

    // Subscribe to independent WHO-UMC stores
    $: isWorkerReady = $whoUmcWorkerStatus === 'ready';
    $: currentReasoningStatus = $whoUmcReasoningStatus[selectedPatient] || 'idle';
    $: aiReasoning = $whoUmcReasoningResults[selectedPatient] || whoUmcWorkerManager.loadFromLocalStorage(selectedPatient);

    // Auto-apply AI answers when reasoning is available
    $: if (aiReasoning && aiReasoning.answers) {
        applyAIAnswersToCheckboxes();
    }

    const questions = [
        {
            text: "Is the time interval between drug administration and adverse event onset pharmacologically plausible?",
            items: [
                { text: "Yes (plausible)", code: "yes" },
                { text: "No (temporally implausible)", code: "no" }
            ]
        },
        {
            text: "Can the underlying disease or concomitant medications sufficiently explain the adverse event?",
            items: [
                { text: "Yes (other cause is more likely)", code: "yes" },
                { text: "No (other causes unlikely)", code: "no" },
                { text: "Unclear", code: "unknown" }
            ]
        },
        {
            text: "Was there clinically reasonable improvement when the suspected drug was discontinued or reduced?",
            items: [
                { text: "Yes (improved)", code: "yes" },
                { text: "No (no change / worsened)", code: "no" },
                { text: "Not attempted / No information", code: "unknown" }
            ]
        },
        {
            text: "Did the adverse event recur upon re-administration of the same drug?",
            items: [
                { text: "Yes (recurred)", code: "yes" },
                { text: "No (did not recur)", code: "no" },
                { text: "Not re-administered / No information", code: "unknown" }
            ]
        },
        {
            text: "Is the adverse event a well-known specific pharmacological reaction to the drug? (e.g., anaphylaxis, drug-specific syndrome)",
            items: [
                { text: "Yes", code: "yes" },
                { text: "No", code: "no" },
                { text: "Unknown", code: "unknown" }
            ]
        }
    ];

    let answers = createInitialAnswers();

    function createInitialAnswers() {
        return { q1: [], q2: [], q3: [], q4: [], q5: [] };
    }

    function convertAnswerToCode(answer) {
        if (!answer) return "unknown";
        const normalized = answer.toLowerCase().trim();
        if (normalized === 'yes') return 'yes';
        if (normalized === 'no') return 'no';
        return "unknown";
    }

    function applyAIAnswersToCheckboxes() {
        if (!aiReasoning || !aiReasoning.answers) return;

        aiSelectedAnswers = {};

        aiReasoning.answers
            .filter(item => item && item.question >= 1 && item.question <= 5 && item.answer)
            .forEach((item) => {
                const questionKey = `q${item.question}`;
                const answerCode = convertAnswerToCode(item.answer);
                if (answers[questionKey] !== undefined) {
                    answers[questionKey] = [answerCode];
                    aiSelectedAnswers[item.question] = answerCode;
                }
            });

        answers = { ...answers };
        aiSelectedAnswers = { ...aiSelectedAnswers };
        console.log('WHO-UMC AI Selected Answers:', aiSelectedAnswers);
    }

    // Load data when patient changes
    $: if (selectedPatient) {
        loadFromLocalStorage();
        showQuestionModal = false;
    }

    function loadFromLocalStorage() {
        answers = createInitialAnswers();
        noteValue = "";
        aiSelectedAnswers = {};
        let storedData = JSON.parse(localStorage.getItem('whoUmcData')) || {};
        if (storedData[selectedPatient]) {
            if (storedData[selectedPatient].answers) {
                answers = storedData[selectedPatient].answers;
            }
            noteValue = storedData[selectedPatient].note || "";
        }

        // Load AI reasoning for this patient
        const patientReasoning = whoUmcWorkerManager.loadFromLocalStorage(selectedPatient);
        console.log('Loaded WHO-UMC AI reasoning for patient', selectedPatient, ':', patientReasoning);
    }

    export function saveToLocalStorage() {
        let storedData = JSON.parse(localStorage.getItem('whoUmcData')) || {};

        storedData[selectedPatient] = {
            answers: { ...answers },
            category: category,
            note: noteValue
        };

        localStorage.setItem('whoUmcData', JSON.stringify(storedData));

        showSaveMessage = true;
        setTimeout(() => {
            showSaveMessage = false;
        }, 1000);
    }

    export function reset() {
        answers = createInitialAnswers();
        noteValue = "";
        aiSelectedAnswers = {};
    }

    function determineCategory() {
        const q1 = answers.q1[0];
        const q2 = answers.q2[0];
        const q3 = answers.q3[0];
        const q4 = answers.q4[0];
        const q5 = answers.q5[0];

        // Unassessable: no answers at all
        if (q1 === undefined) return "Unassessable";

        // 1. Unlikely: Q1='No' AND Q2='Yes'
        if (q1 === 'no' && q2 === 'yes') {
            return "Unlikely";
        }

        // 2. Certain: Q1='Yes' AND Q2='No' AND Q3='Yes' AND Q4='Yes' AND Q5='Yes'
        //    If Q5≠'Yes', downgrade to Probable
        if (q1 === 'yes' && q2 === 'no' && q3 === 'yes' && q4 === 'yes') {
            return q5 === 'yes' ? "Certain" : "Probable";
        }

        // 3. Probable: Q1='Yes' AND Q2='No' AND Q3='Yes' (Q4 doesn't matter)
        if (q1 === 'yes' && q2 === 'no' && q3 === 'yes') {
            return "Probable";
        }

        // 4. Possible: Q1='Yes' AND ((Q2='Yes' or Q2='Unknown') OR (Q3='No' or Q3='Unknown'))
        if (q1 === 'yes' && ((q2 === 'yes' || q2 === 'unknown') || (q3 === 'no' || q3 === 'unknown'))) {
            return "Possible";
        }

        return "Unassessable";
    }

    $: category = determineCategory();
    $: answers, category = determineCategory();

    // Get reasoning for selected question
    $: selectedQuestionReasoning = aiReasoning?.answers?.[selectedQuestionIndex] || null;

    // Initialize WHO-UMC worker on mount
    onMount(async () => {
        try {
            await whoUmcWorkerManager.initialize();
        } catch (error) {
            console.error('Failed to initialize WHO-UMC AI worker:', error);
        }
    });

    /**
     * Request AI reasoning (independent from Naranjo)
     */
    async function requestAIReasoning() {
        if (!isWorkerReady) {
            alert('AI service is not ready. Please check LocalAI connection.');
            return;
        }

        if (!selectedPatient || !patientData) {
            alert('No patient selected');
            return;
        }

        try {
            const records = patientData[selectedPatient];
            if (!records || records.length === 0) {
                alert('No data available for this patient');
                return;
            }

            const chartData = $chartComputedData;
            const classification = $drugClassification;

            const iciDrugs = chartData.iciDrugs && chartData.iciDrugs.length > 0
                ? chartData.iciDrugs
                : [...new Set(records.filter(r => r.ICI_lasting).map(r => r.drug_name).filter(Boolean))];

            const gradeChanges = chartData.gradeChanges && chartData.gradeChanges.length > 0
                ? chartData.gradeChanges
                : [];

            const allGradeData = chartData.allGradeData || [];

            const iciExposurePeriods = chartData.iciExposurePeriods && Object.keys(chartData.iciExposurePeriods).length > 0
                ? chartData.iciExposurePeriods
                : {};

            const totalDays = chartData.totalDays || Math.max(...records.map(r => r.day_num || 0));

            const toxicDrugs = classification.toxic || [];
            const safeDrugSet = new Set(classification.safe || []);
            const toxicIdToIngredient = classification.toxicIdToIngredient || {};

            // Build individual exposure periods for toxic drugs using drug_concept_id matching
            const toxicDaysMap = {};
            records.forEach(r => {
                if (r.day_num == null) return;
                const ingredient = toxicIdToIngredient[String(r.drug_concept_id)];
                if (ingredient) {
                    if (!toxicDaysMap[ingredient]) toxicDaysMap[ingredient] = [];
                    toxicDaysMap[ingredient].push(r.day_num);
                }
            });

            const toxicExposurePeriods = {};
            for (const [drugName, days] of Object.entries(toxicDaysMap)) {
                const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
                const periods = [];
                let periodStart = uniqueDays[0];
                let periodEnd = uniqueDays[0];
                for (let i = 1; i < uniqueDays.length; i++) {
                    if (uniqueDays[i] - periodEnd <= 1) {
                        periodEnd = uniqueDays[i];
                    } else {
                        periods.push({ start: periodStart, end: periodEnd });
                        periodStart = uniqueDays[i];
                        periodEnd = uniqueDays[i];
                    }
                }
                periods.push({ start: periodStart, end: periodEnd });
                toxicExposurePeriods[drugName] = periods;
            }

            const aiPatientData = {
                iciDrugs,
                toxicDrugs,
                totalDays,
                iciExposurePeriods,
                toxicExposurePeriods,
                gradeChanges,
                allGradeData
            };

            console.log('WHO-UMC AI patient data:', aiPatientData);

            await whoUmcWorkerManager.requestReasoning(selectedPatient, aiPatientData);

        } catch (error) {
            console.error('Failed to request WHO-UMC AI reasoning:', error);
            alert('Failed to get AI reasoning. Please try again.');
        }
    }

    function showQuestionReasoning(questionIndex) {
        if (!aiReasoning || !aiReasoning.answers) {
            alert('No AI reasoning available. Please click "AI Analysis" first.');
            return;
        }

        selectedQuestionIndex = questionIndex;
        showQuestionModal = false;
        setTimeout(() => {
            showQuestionModal = true;
        }, 0);
    }
</script>

<Card>
    <CardBody>
        <div>
            <div style="font-size: 18px; font-weight: bold;">WHO-UMC Causality</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <div style="font-size: 18px; font-weight: bold;">Assessment</div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    {#if !isWorkerReady}
                        <span style="font-size: 12px; color: #dc3545;">AI Offline</span>
                    {:else if currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                        <div class="spinner"></div>
                    {/if}

                    <Button
                        size="sm"
                        color="info"
                        on:click={requestAIReasoning}
                        disabled={!isWorkerReady || currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                        title="Request AI to analyze this case"
                        style="border-radius: 20px; margin-bottom: -3px;"
                    >
                        {#if currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                            Processing...
                        {:else}
                            AI Analysis
                        {/if}
                    </Button>
                </div>
            </div>
        </div>
    </CardBody>

    <CardBody>
        {#each questions as question, index}
            <div style="margin-bottom: 16px;">
                <div class="question-header">
                    <p style="margin-bottom: 8px; font-weight: bold;">{index + 1}. {question.text}</p>
                    {#if aiReasoning && aiReasoning.answers}
                        <button
                            type="button"
                            class="tooltip-button"
                            on:click|stopPropagation={() => showQuestionReasoning(index)}
                            title="View reasoning for this question"
                        >
                            <img src="/tooltip.svg" alt="Reasoning" class="tooltip-icon" />
                        </button>
                    {/if}
                </div>
                {#each question.items as item}
                    <div class="checkbox-wrapper" class:selected={answers[`q${index + 1}`][0] === item.code}>
                        <div class="checkbox-content">
                            <Checkbox
                                label={item.text}
                                checked={answers[`q${index + 1}`][0] === item.code}
                                on:change={() => {
                                    answers = {
                                        ...answers,
                                        [`q${index + 1}`]: [item.code]
                                    };
                                }}
                            />
                        </div>
                        {#if aiSelectedAnswers[index + 1] === item.code}
                            <span class="ai-badge" title="AI selected this answer">AI</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    </CardBody>

    <Fieldset>
        <FormTextarea
            col="12"
            label="Note"
            placeholder="Enter your notes here"
            bind:value={noteValue}
        />
    </Fieldset>

    <CardBody style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
        <p style="font-weight: bold; text-align: left; margin: 0; font-size: 16px;">
            {#if category}
                {category}
            {:else}
                No answers yet
            {/if}
        </p>
        <Button color="secondary" style="padding: 8px 14px; font-size: 16px;" on:click={saveToLocalStorage}>Submit</Button>
    </CardBody>
</Card>

{#if showSaveMessage}
    <div class="toast-message">
        <div class="toast-content">
            <span class="checkmark">✓</span>
            <span>Successfully Saved!</span>
        </div>
    </div>
{/if}

<!-- Question Reasoning Modal -->
<QuestionReasoningModal
    bind:isOpen={showQuestionModal}
    questionNumber={selectedQuestionIndex + 1}
    questionText={questions[selectedQuestionIndex]?.text || ''}
    reasoning={selectedQuestionReasoning}
    allQuestionsAI={true}
/>

<style>
    .question-header {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: space-between;
    }

    .question-header p {
        flex: 1;
        margin: 0 0 8px 0;
    }

    .tooltip-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
        opacity: 0.6;
    }

    .tooltip-button:hover {
        opacity: 1;
        background-color: #f8f9fa;
        transform: scale(1.1);
    }

    .tooltip-icon {
        width: 24px;
        height: 24px;
        filter: grayscale(20%);
    }

    .ai-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        margin-left: auto;
        flex-shrink: 0;
    }

    .checkbox-wrapper {
        transition: all 0.2s ease;
        border-radius: 4px;
        padding: 4px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        position: relative;
    }

    .checkbox-content {
        flex: 1;
        display: flex;
        align-items: center;
    }

    .checkbox-wrapper.selected {
        background: linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-left: 3px solid #667eea;
        padding-left: 8px;
        margin-left: -8px;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .toast-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }

    .toast-content {
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
    }

    .checkmark {
        font-size: 18px;
        font-weight: bold;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }
</style>
