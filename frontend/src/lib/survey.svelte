<script>
    import { Checkbox, Card, CardBody, Fieldset, FormTextarea, Button } from "yesvelte";
    import { onMount, onDestroy } from "svelte";
    import { naranjoWorkerManager, workerStatus, reasoningStatus, reasoningResults } from "./ollama/NaranjoWorkerManager.js";
    import AIReasoningModal from "./AIReasoningModal.svelte";
    import QuestionReasoningModal from "./QuestionReasoningModal.svelte";
    import { drugClassification, chartComputedData } from "./duckdb.js";

    export let selectedPatient;
    export let patientData;


    let items = [
        { text: "Yes", code: "yes" },
        { text: "No", code: "no" },
        { text: "Do not know or not done", code: "don't know" }
    ];

    let questions = [
        "Are there previous conclusive reports on this reaction?",
        "Did the adverse events appear after the suspected drug was given?",
        "Did the adverse reaction improve when the drug was discontinued or a specific antagonist was given?",
        "Did the adverse reaction appear when the drug was re-administered?",
        "Are there alternative causes that could have caused the reaction?",
        "Did the reaction reappear when a placebo was given?",
        "Was the drug detected in any body fluid in toxic concentrations?",
        "Was the reaction more severe when the dose was increased, or less severe when the dose was decreased?",
        "Did the patient have a similar reaction to the same or similar drugs in any previous exposure?",
        "Was the adverse event confirmed by any objective evidence?"
    ];

    // Pre-defined explanations for non-AI questions (1, 2, 6, 7, 8, 9, 10)
    const predefinedExplanations = {
        0: { // Question 1
            answer: "Yes",
            reasoning: "According to the National Library of Medicine's LiverTox database, immune checkpoint inhibitors (ICIs) including Atezolizumab, Nivolumab, Pembrolizumab, and Ipilimumab are well-documented causes of hepatotoxicity. Previous conclusive reports exist in medical literature confirming this adverse drug reaction.",
            confidence: "High"
        },
        1: { // Question 2
            answer: "Yes",
            reasoning: "The CDM data shows that hepatotoxicity (elevated liver enzymes and increased grade levels) appeared after the administration of ICI drugs. The temporal relationship between drug exposure and adverse event onset is clearly established in the patient timeline.",
            confidence: "High"
        },
        5: { // Question 6
            answer: "Do not know",
            reasoning: "There is no information available in the CDM data regarding placebo administration or placebo-controlled rechallenge. This information is typically not recorded in routine clinical data models.",
            confidence: "High"
        },
        6: { // Question 7
            answer: "Do not know",
            reasoning: "The CDM data does not include specific drug concentration measurements in body fluids (blood, urine, etc.). Therapeutic drug monitoring for ICIs is not routinely performed in clinical practice, and toxic concentration thresholds are not established for these biologics.",
            confidence: "High"
        },
        7: { // Question 8
            answer: "Do not know",
            reasoning: "The available CDM data does not provide sufficient information about dose adjustments and their correlation with reaction severity. ICI dosing is typically fixed based on weight or given as a flat dose, with limited dose-response data for hepatotoxicity.",
            confidence: "Medium"
        },
        8: { // Question 9
            answer: "Do not know",
            reasoning: "There is no historical data available in the current CDM dataset regarding previous exposures to the same or similar drugs (cross-reactivity between different ICIs). Prior medication history outside the current treatment episode is not captured.",
            confidence: "Medium"
        },
        9: { // Question 10
            answer: "Yes",
            reasoning: "The adverse event (hepatotoxicity) is confirmed by objective evidence in the form of laboratory measurements: elevated AST, ALT, ALP, and total bilirubin levels, as well as graded hepatotoxicity severity scores recorded in the CDM data. These are standard objective biomarkers for liver injury.",
            confidence: "High"
        }
    };

    let answers = createInitialAnswers();
    let noteValue = ""; // 메모 저장 변수
    let showSaveMessage = false; // 저장 메시지 표시 상태

    // AI Reasoning related state
    let aiReasoning = null;
    let showReasoningModal = false;
    let showQuestionModal = false;
    let selectedQuestionIndex = 0;
    let isWorkerReady = false;
    let currentReasoningStatus = 'idle'; // idle, processing, completed, failed

    // Track AI-selected answers (question -> answer code mapping)
    let aiSelectedAnswers = {};

    // Subscribe to worker status
    $: isWorkerReady = $workerStatus === 'ready';
    $: currentReasoningStatus = $reasoningStatus[selectedPatient] || 'idle';
    $: aiReasoning = $reasoningResults[selectedPatient] || naranjoWorkerManager.loadFromLocalStorage(selectedPatient);

    // Get reasoning for selected question (AI or predefined)
    $: selectedQuestionReasoning = aiReasoning?.answers?.[selectedQuestionIndex] || predefinedExplanations[selectedQuestionIndex] || null;

    // Auto-apply AI answers when reasoning is available
    $: if (aiReasoning && aiReasoning.answers) {
        applyAIAnswersToCheckboxes();
    }

    /**
     * Apply AI answers to checkboxes (only for questions 3, 4, 5)
     */
    function applyAIAnswersToCheckboxes() {
        if (!aiReasoning || !aiReasoning.answers) return;

        // Reset AI selected answers tracking
        aiSelectedAnswers = {};

        // Convert AI answers to checkbox format
        // Only apply AI answers to questions 3, 4, 5
        aiReasoning.answers
            .filter(item => item && item.question >= 3 && item.question <= 5 && item.answer)
            .forEach((item) => {
                const questionKey = `q${item.question}`;
                const answerCode = convertAnswerToCode(item.answer);

                if (answers[questionKey] !== undefined) {
                    answers[questionKey] = [answerCode];
                    // Track which answer AI selected for this question
                    aiSelectedAnswers[item.question] = answerCode;
                }
            });

        // Trigger reactivity and recalculate score
        answers = { ...answers };
        aiSelectedAnswers = { ...aiSelectedAnswers };
        totalScore = calculateScore();

        console.log('AI Selected Answers (Q3-5 only):', aiSelectedAnswers);
    }

    /**
     * Convert AI answer to code format used in the app
     */
    function convertAnswerToCode(answer) {
        // Handle undefined or null answers
        if (!answer) return "don't know";

        const normalized = answer.toLowerCase().trim();
        if (normalized === 'yes') return 'yes';
        if (normalized === 'no') return 'no';
        if (normalized === 'unknown') return "don't know";
        return "don't know";
    }

    function createInitialAnswers() {
        return {
            q1: [items[0].code],
            q2: [items[0].code],
            q3: [],
            q4: [],
            q5: [],
            q6: [items[2].code],
            q7: [items[2].code],
            q8: [items[2].code],
            q9: [items[2].code],
            q10: [items[0].code]
        };
    }

    function reset() {
        answers = createInitialAnswers();
        noteValue = ""; // 메모 필드 초기화
        aiSelectedAnswers = {}; // AI 선택 답변 초기화
    }

    // 환자가 변경되면 로컬스토리지에서 데이터 로드
    $: if (selectedPatient) {
        console.log('Patient changed to:', selectedPatient);
        reset();

        // Load survey data
        let storedData = JSON.parse(localStorage.getItem('naranjoAlgorithmData')) || {};
        if (storedData[selectedPatient]) {
            totalScore = storedData[selectedPatient].totalScore || 0;
            noteValue = storedData[selectedPatient].note || ""; // 저장된 메모 로드
             if (storedData[selectedPatient].answers) {
                answers = storedData[selectedPatient].answers;
            }
        }

        // Load AI reasoning for this specific patient
        const patientReasoning = naranjoWorkerManager.loadFromLocalStorage(selectedPatient);
        console.log('Loaded AI reasoning for patient', selectedPatient, ':', patientReasoning);

        // Reset modal state when patient changes
        showQuestionModal = false;
        showReasoningModal = false;
    }

    let scoringRules = {
        rule1: { yes: 1, no: 0, "don't know": 0 },
        rule2: { yes: 2, no: -1, "don't know": 0 },
        rule3: { yes: -1, no: 2, "don't know": 0 },
        rule4: { yes: -1, no: 1, "don't know": 0 }
    };

    let questionRules = {
        q1: "rule1",
        q2: "rule2",
        q3: "rule1",
        q4: "rule2",
        q5: "rule3",
        q6: "rule4",
        q7: "rule1",
        q8: "rule1",
        q9: "rule1",
        q10: "rule1"
    };

    function calculateScore() {
        return Object.entries(answers).reduce((total, [question, selectedValues]) => {
            let ruleKey = questionRules[question];
            let rule = scoringRules[ruleKey];
            return total + selectedValues.reduce((sum, code) => sum + (rule[code] || 0), 0);
        }, 0);
    }

    export function saveToLocalStorage() {
        let storedData = JSON.parse(localStorage.getItem('naranjoAlgorithmData')) || {};

        storedData[selectedPatient] = {
            totalScore: totalScore,
            note: noteValue, // 메모 값도 저장
            answers: { ...answers } // 현재 답변 상태 저장
        };

        localStorage.setItem('naranjoAlgorithmData', JSON.stringify(storedData));

        console.log("Updated Local Storage:", storedData);
        
        // 저장 성공 메시지 표시
        showSaveMessage = true;
        setTimeout(() => {
            showSaveMessage = false;
        }, 1000); // 1초 후 메시지 숨김
    }

    $: totalScore = calculateScore();

    // 점수에 따른 ADR 분류
    $: adrCategory = (() => {
        if (totalScore >= 9) return "Definite";
        if (totalScore >= 5) return "Probable";
        if (totalScore >= 1) return "Possible";
        return "Doubtful";
    })();

    // Initialize worker on mount
    onMount(async () => {
        try {
            await naranjoWorkerManager.initialize();
        } catch (error) {
            console.error('Failed to initialize AI worker:', error);
        }
    });

    // Cleanup on destroy
    onDestroy(() => {
        // Worker persists across component lifecycle for efficiency
        // Only terminate if absolutely necessary
    });

    /**
     * Request AI reasoning for current patient
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
            // Get patient records array
            const records = patientData[selectedPatient];

            if (!records || records.length === 0) {
                alert('No data available for this patient');
                return;
            }

            console.log('Patient records:', records);

            // Extract unique drugs from all records
            const allDrugs = [...new Set(records.map(r => r.drug_name).filter(Boolean))];

            // Get pre-computed data from DrugChart via shared store
            const chartData = $chartComputedData;
            const classification = $drugClassification;

            // Use pre-computed ICI data from DrugChart (more accurate with ICI_lasting effect duration)
            const iciDrugs = chartData.iciDrugs && chartData.iciDrugs.length > 0
                ? chartData.iciDrugs
                : [...new Set(records.filter(r => r.ICI_lasting).map(r => r.drug_name).filter(Boolean))];

            // Use pre-computed grade changes from DrugChart
            const gradeChanges = chartData.gradeChanges && chartData.gradeChanges.length > 0
                ? chartData.gradeChanges
                : extractGradeChanges(records);

            // Use pre-computed ICI exposure periods from DrugChart (includes effect duration!)
            const iciExposurePeriods = chartData.iciExposurePeriods && Object.keys(chartData.iciExposurePeriods).length > 0
                ? chartData.iciExposurePeriods
                : computeICIExposurePeriods(records);

            // Use pre-computed totalDays from DrugChart
            const totalDays = chartData.totalDays || Math.max(...records.map(r => r.day_num || 0));

            // Extract all unique grades
            const grades = [...new Set(
                records
                    .map(r => r.grade)
                    .filter(g => g !== null && g !== undefined && g !== "-1")
            )];

            // Build drug timeline
            const drugTimeline = {};
            records.forEach(r => {
                const dayNum = r.day_num || 0;
                const drugName = r.drug_name;
                const isICI = !!r.ICI_lasting;

                if (drugName) {
                    if (!drugTimeline[drugName]) {
                        drugTimeline[drugName] = { startDay: dayNum, endDay: dayNum, isICI: isICI };
                    } else {
                        drugTimeline[drugName].endDay = Math.max(drugTimeline[drugName].endDay, dayNum);
                        drugTimeline[drugName].startDay = Math.min(drugTimeline[drugName].startDay, dayNum);
                    }
                }
            });

            // Get toxic/safe drugs from shared store (set by DrugChart.svelte)
            const toxicDrugs = classification.toxic || [];
            const safeDrugs = classification.safe || [];

            // Prepare patient data for AI (exclude PHI like age/gender)
            const aiPatientData = {
                drugs: allDrugs,
                iciDrugs: iciDrugs,
                toxicDrugs: toxicDrugs,
                safeDrugs: safeDrugs,
                grades: grades,
                totalDays: totalDays,
                drugTimeline: drugTimeline,
                iciExposurePeriods: iciExposurePeriods,
                gradeChanges: gradeChanges
            };

            console.log('Prepared AI patient data:', aiPatientData);
            console.log('=== Using pre-computed data from DrugChart ===');
            console.log('ICI Exposure Periods (with effect duration):', iciExposurePeriods);
            console.log('Grade Changes:', gradeChanges);
            console.log('Total Days:', totalDays);
            console.log('Toxic drugs:', toxicDrugs);
            console.log('Safe drugs:', safeDrugs);
            console.log('==============================================');

            // Request reasoning from worker
            await naranjoWorkerManager.requestReasoning(selectedPatient, aiPatientData);

        } catch (error) {
            console.error('Failed to request AI reasoning:', error);
            alert('Failed to get AI reasoning. Please try again.');
        }
    }

    /**
     * Fallback: Extract grade changes from records if not available from chart
     */
    function extractGradeChanges(records) {
        const gradeTimeline = [];
        records.forEach(r => {
            const grade = r.grade;
            if (grade !== null && grade !== undefined && grade !== "-1") {
                gradeTimeline.push({ day: r.day_num || 0, grade: grade });
            }
        });

        gradeTimeline.sort((a, b) => a.day - b.day);

        const gradeChanges = [];
        let lastGrade = null;
        gradeTimeline.forEach(g => {
            if (g.grade !== lastGrade) {
                gradeChanges.push(g);
                lastGrade = g.grade;
            }
        });

        return gradeChanges;
    }

    /**
     * Fallback: Compute ICI exposure periods if not available from chart
     */
    function computeICIExposurePeriods(records) {
        const iciExposureDays = {};

        records.forEach(r => {
            const dayNum = r.day_num || 0;
            const drugName = r.drug_name;
            const isICI = !!r.ICI_lasting;

            if (isICI && drugName) {
                if (!iciExposureDays[drugName]) {
                    iciExposureDays[drugName] = [];
                }
                if (!iciExposureDays[drugName].includes(dayNum)) {
                    iciExposureDays[drugName].push(dayNum);
                }
            }
        });

        const iciExposurePeriods = {};
        Object.entries(iciExposureDays).forEach(([drugName, days]) => {
            days.sort((a, b) => a - b);
            const periods = [];
            let periodStart = days[0];
            let periodEnd = days[0];

            for (let i = 1; i < days.length; i++) {
                if (days[i] - periodEnd > 14) {
                    periods.push({ start: periodStart, end: periodEnd });
                    periodStart = days[i];
                }
                periodEnd = days[i];
            }
            periods.push({ start: periodStart, end: periodEnd });
            iciExposurePeriods[drugName] = periods;
        });

        return iciExposurePeriods;
    }

    /**
     * Toggle reasoning modal
     */
    function toggleReasoningModal() {
        showReasoningModal = !showReasoningModal;
    }

    /**
     * Show question reasoning modal
     */
    function showQuestionReasoning(questionIndex) {
        console.log('showQuestionReasoning called with index:', questionIndex);
        console.log('aiReasoning:', aiReasoning);
        console.log('aiReasoning.answers:', aiReasoning?.answers);

        // For questions 3, 4, 5: require AI reasoning
        if (questionIndex >= 2 && questionIndex <= 4) {
            if (!aiReasoning || !aiReasoning.answers) {
                alert('No AI reasoning available. Please click "Analyze with AI" first.');
                return;
            }
        }
        // For other questions (1, 2, 6, 7, 8, 9, 10): use predefined explanations
        // No check needed - they always have predefined explanations

        selectedQuestionIndex = questionIndex;
        console.log('Selected question reasoning:', aiReasoning?.answers?.[questionIndex] || predefinedExplanations[questionIndex]);

        // Force a tick to ensure state update
        showQuestionModal = false;
        setTimeout(() => {
            showQuestionModal = true;
            console.log('showQuestionModal set to:', showQuestionModal);
        }, 0);
    }

    /**
     * Get status badge info
     */
    function getStatusBadge(status) {
        switch (status) {
            case 'queued':
                return { text: 'Queued', color: 'info' };
            case 'processing':
                return { text: 'Processing...', color: 'warning' };
            case 'completed':
                return { text: 'Completed', color: 'success' };
            case 'failed':
                return { text: 'Failed', color: 'danger' };
            default:
                return null;
        }
    }
</script>

<Card>
    <CardBody>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 18px; font-weight: bold;">Naranjo Scale</div>

            <!-- AI Reasoning Controls -->
            <div style="display: flex; gap: 8px; align-items: center;">
                {#if !isWorkerReady}
                    <span style="font-size: 12px; color: #dc3545;">AI Offline</span>
                {:else if currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                    <div class="spinner"></div>
                {:else if currentReasoningStatus === 'completed' && aiReasoning}
                    <button
                        class="icon-button"
                        on:click={toggleReasoningModal}
                        title="View AI Reasoning Details"
                    >                    </button>
                {/if}

                <Button
                    size="sm"
                    color="info"
                    on:click={requestAIReasoning}
                    disabled={!isWorkerReady || currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                    title="Request AI to analyze this case"
                    style="border-radius: 20px;"
                >
                    {#if currentReasoningStatus === 'processing' || currentReasoningStatus === 'queued'}
                        Processing...
                    {:else}
                        Analyze with AI
                    {/if}
                </Button>
            </div>
        </div>
    </CardBody>

    <CardBody>
        {#each questions as questionText, index}
            <div style="margin-bottom: 16px;">
                <div class="question-header">
                    <p style="margin-bottom: 8px; font-weight: bold;">{index + 1}. {questionText}</p>
                    {#if index >= 2 && index <= 4}
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
                    {:else if predefinedExplanations[index]}
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
                {#each items as item}
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
                                totalScore = calculateScore();
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
        <p style="font-weight: bold; text-align: left; margin: 0; font-size: 16px;">({totalScore}) {adrCategory} ADR</p>
        <!-- possible/probable 점수 옆에 두가지 바뀌도록 -->
        <Button color="secondary" style="padding: 8px 14px; font-size: 16px;" on:click={saveToLocalStorage}>Submit</Button>
    </CardBody>
    
</Card>

<!-- 저장 성공 토스트 메시지 -->
{#if showSaveMessage}
    <div class="toast-message">
        <div class="toast-content">
            <span class="checkmark">✓</span>
            <span>Successfully Saved!</span>
        </div>
    </div>
{/if}

<!-- AI Reasoning Modal (All Questions) -->
<AIReasoningModal
    bind:isOpen={showReasoningModal}
    reasoning={aiReasoning}
    patientNo={selectedPatient}
/>

<!-- Question Reasoning Modal (Single Question) -->
<QuestionReasoningModal
    bind:isOpen={showQuestionModal}
    questionNumber={selectedQuestionIndex + 1}
    questionText={questions[selectedQuestionIndex]}
    reasoning={selectedQuestionReasoning}
/>

<style>
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

    .icon-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-button:hover {
        background-color: #f8f9fa;
    }

    .icon-button:active {
        background-color: #e9ecef;
    }

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

    .tooltip-button:active {
        background-color: #e9ecef;
        transform: scale(0.95);
    }

    .tooltip-icon {
        width: 24px;
        height: 24px;
        filter: grayscale(20%);
    }

    .tooltip-emoji {
        font-size: 18px;
        line-height: 1;
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
</style>