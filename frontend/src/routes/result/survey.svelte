<script>
    import { Card, FormCheckboxGroup, CardBody, Fieldset, FormTextarea } from "yesvelte";

    export let selectedPatient;
    export let patientData;

    // 질문 항목
    let items = [
        { text: "Yes", code: "yes" },
        { text: "No", code: "no" },
        { text: "Do not know or not done", code: "don't know" }
    ];

    // 질문 텍스트
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

    // 설문 초기화
    let answers = createInitialAnswers();

    function createInitialAnswers() {
        return {
            q1: [],
            q2: [],
            q3: [],
            q4: [],
            q5: [],
            q6: [],
            q7: [],
            q8: [],
            q9: [],
            q10: []
        };
    }

    function reset() {
        answers = createInitialAnswers();
        console.log("Page has been reset:", answers);
    }

    // 환자가 변경되면 reset 호출
    $: if (selectedPatient) {
        reset();
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

    $: totalScore = calculateScore();
</script>

<Card>
    <CardBody>
        <div style="font-size: 18px; font-weight: bold;">Naranjo Algorithm</div>
    </CardBody>

    <CardBody>
        {#each questions as questionText, index}
            <FormCheckboxGroup
                label="{index + 1}. {questionText}"
                bind:value={answers[`q${index + 1}`]}
                items={items.map(item => item.text)}
            />
        {/each}
    </CardBody>

    <Fieldset>
        <FormTextarea col="12" label="Note" placeholder="Enter your notes here" />
    </Fieldset>

    <CardBody>
        <p style="font-weight: bold;">Total Score: {totalScore}</p>
    </CardBody>
</Card>
