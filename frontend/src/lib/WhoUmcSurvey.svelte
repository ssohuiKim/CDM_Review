<script>
    import { Checkbox, Card, CardBody, Fieldset, FormTextarea, Button } from "yesvelte";

    export let selectedPatient;
    export let patientData;

    let noteValue = "";
    let showSaveMessage = false;

    const questions = [
        {
            text: "Is the time interval between drug administration and adverse event onset pharmacologically plausible?",
            items: [
                { text: "Yes (plausible)", code: "yes" },
                { text: "No (temporally implausible)", code: "no" },
                { text: "Unknown / Insufficient information", code: "unknown" }
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
        return {
            q1: [],
            q2: [],
            q3: [],
            q4: [],
            q5: []
        };
    }

    // Load data when patient changes
    $: if (selectedPatient) {
        loadFromLocalStorage();
    }

    function loadFromLocalStorage() {
        answers = createInitialAnswers();
        noteValue = "";
        let storedData = JSON.parse(localStorage.getItem('whoUmcData')) || {};
        if (storedData[selectedPatient]) {
            if (storedData[selectedPatient].answers) {
                answers = storedData[selectedPatient].answers;
            }
            noteValue = storedData[selectedPatient].note || "";
        }
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
    }

    function determineCategory() {
        const q1 = answers.q1[0];
        const q2 = answers.q2[0];
        const q3 = answers.q3[0];
        const q4 = answers.q4[0];
        const q5 = answers.q5[0];

        const answeredCount = [q1, q2, q3, q4, q5].filter(a => a !== undefined).length;

        // Not enough answers
        if (answeredCount === 0) return null;
        if (answeredCount < 3) return "Unassessable/Unclassifiable";

        // Certain: Q1=yes, Q2=no, Q3=yes, Q4=yes, Q5=yes
        if (q1 === 'yes' && q2 === 'no' && q3 === 'yes' && q4 === 'yes' && q5 === 'yes') {
            return "Certain";
        }

        // Probable/Likely: Q1=yes, Q2=no, Q3=yes
        if (q1 === 'yes' && q2 === 'no' && q3 === 'yes') {
            return "Probable/Likely";
        }

        // Possible: Q1=yes, Q2=yes or unknown
        if (q1 === 'yes' && (q2 === 'yes' || q2 === 'unknown')) {
            return "Possible";
        }

        // Unlikely: Q1=no OR Q2=yes
        if (q1 === 'no' || q2 === 'yes') {
            return "Unlikely";
        }

        // Conditional/Unclassified: additional info needed
        return "Conditional/Unclassified";
    }

    $: category = determineCategory();
    // Recalculate when answers change
    $: answers, category = determineCategory();
</script>

<Card>
    <CardBody>
        <div>
            <div style="font-size: 18px; font-weight: bold;">WHO-UMC Causality</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <div style="font-size: 18px; font-weight: bold;">Assessment</div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    <Button
                        size="sm"
                        color="info"
                        disabled={true}
                        title="Request AI to analyze this case"
                        style="border-radius: 20px; margin-bottom: -3px;"
                    >
                        Analyze with AI
                    </Button>
                </div>
            </div>
        </div>
    </CardBody>

    <CardBody>
        {#each questions as question, index}
            <div style="margin-bottom: 16px;">
                <p style="margin-bottom: 8px; font-weight: bold;">{index + 1}. {question.text}</p>
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

<style>
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
