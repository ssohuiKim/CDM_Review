<script>
    import { Checkbox, Card, CardBody, Fieldset, FormTextarea, Button } from "yesvelte";

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

    let answers = createInitialAnswers();
    let noteValue = ""; // 메모 저장 변수

    function createInitialAnswers() {
        return {
            q1: [items[0].code],
            q2: [items[0].code],
            q3: [],
            q4: [],
            q5: [],
            q6: [items[2].code],
            q7: [items[2].code],
            q8: [],
            q9: [items[2].code],
            q10: [items[0].code]
        };
    }

    function reset() {
        answers = createInitialAnswers();
        noteValue = ""; // 메모 필드 초기화
    }

    // 환자가 변경되면 로컬스토리지에서 데이터 로드
    $: if (selectedPatient) {
        reset();

        let storedData = JSON.parse(localStorage.getItem('naranjoAlgorithmData')) || {};
        if (storedData[selectedPatient]) {
            totalScore = storedData[selectedPatient].totalScore || 0;
            noteValue = storedData[selectedPatient].note || ""; // 저장된 메모 로드
        }
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

    function saveToLocalStorage() {
        let storedData = JSON.parse(localStorage.getItem('naranjoAlgorithmData')) || {};

        storedData[selectedPatient] = {
            totalScore: totalScore,
            note: noteValue // 메모 값도 저장
        };

        localStorage.setItem('naranjoAlgorithmData', JSON.stringify(storedData));

        console.log("Updated Local Storage:", storedData);
    }

    $: totalScore = calculateScore();
</script>

<Card>
    <CardBody>
        <div style="font-size: 18px; font-weight: bold;">Naranjo Algorithm</div>
    </CardBody>

    <CardBody>
        {#each questions as questionText, index}
            <div style="margin-bottom: 16px;">
                <p style="margin-bottom: 8px; font-weight: bold;">{index + 1}. {questionText}</p>
                {#each items as item}
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
        <p style="font-weight: bold; text-align: left; margin: 0; font-size: 16px;">({totalScore}) possible ADR</p>
        <!-- possible/probable 점수 옆에 두가지 바뀌도록 -->
        <Button color="secondary" style="padding: 8px 14px; font-size: 16px;" on:click={saveToLocalStorage}>Submit</Button>
    </CardBody>
    
</Card>
