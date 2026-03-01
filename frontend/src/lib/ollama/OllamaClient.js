/**
 * Ollama Client
 * Handles communication with Ollama API for Naranjo Algorithm reasoning
 */

import { OLLAMA_CONFIG, getApiUrl, getHealthCheckUrl } from './config.js';
import { getMockNaranjoReasoning, mockHealthCheck } from './MockAIClient.js';

/**
 * ICI (Immune Checkpoint Inhibitor) drug list for identification
 */
export const ICI_DRUG_LIST = [
    "atezolizumab", "pembrolizumab", "nivolumab", "durvalumab",
    "avelumab", "ipilimumab", "cemiplimab", "tislelizumab", "camrelizumab"
];

/**
 * Naranjo Algorithm questions and scoring rules
 */
export const NARANJO_QUESTIONS = [
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

/**
 * Fixed answers for specific questions
 */
export const FIXED_ANSWERS = {
    1: {
        answer: "Yes",
        reasoning: "Immune checkpoint inhibitor-induced hepatotoxicity is well-documented in the literature.",
        confidence: "High"
    },
    2: {
        answer: "Yes",
        reasoning: "This drug has been previously reported to the NIH (National Institutes of Health).",
        confidence: "High"
    },
    6: {
        answer: "Unknown",
        reasoning: "No information available regarding placebo rechallenge.",
        confidence: "Low"
    },
    7: {
        answer: "Unknown",
        reasoning: "Drug levels in body fluids were not measured.",
        confidence: "Low"
    },
    8: {
        answer: "Unknown",
        reasoning: "This information cannot be determined from the provided data.",
        confidence: "Low"
    },
    9: {
        answer: "Unknown",
        reasoning: "No information available about previous exposure to similar drugs.",
        confidence: "Low"
    },
    10: {
        answer: "Yes",
        reasoning: "Hepatotoxicity confirmed by objective laboratory evidence (liver function tests).",
        confidence: "High"
    }
};

export const SCORING_RULES = {
    1: { yes: 1, no: 0, unknown: 0 },
    2: { yes: 2, no: -1, unknown: 0 },
    3: { yes: 1, no: 0, unknown: 0 },
    4: { yes: 2, no: -1, unknown: 0 },
    5: { yes: -1, no: 2, unknown: 0 },
    6: { yes: -1, no: 1, unknown: 0 },
    7: { yes: 1, no: 0, unknown: 0 },
    8: { yes: 1, no: 0, unknown: 0 },
    9: { yes: 1, no: 0, unknown: 0 },
    10: { yes: 1, no: 0, unknown: 0 }
};

/**
 * System prompt for structured reasoning (critical for small LLMs)
 */
const SYSTEM_PROMPT = `You are a clinical pharmacology expert analyzing drug-induced liver injury (DILI).

=== CRITICAL RULES ===
- DO NOT invent or fabricate any data
- Use ONLY the exact days, grades, and drug names given in the patient data
- If data is missing or unclear, answer "Unknown"

=== INPUT DATA DESCRIPTION ===
- ICI DRUG EXPOSURE: Immune checkpoint inhibitor drugs with exposure periods. Multiple periods = rechallenge (drug was stopped then restarted).
- HEPATOTOXICITY GRADE CHANGES: Timeline of liver injury severity (Grade 0=none, 1=mild, 2=moderate, 3=severe, 4=life-threatening).
- TOXIC MEDICATIONS: Other drugs known to cause hepatotoxicity (potential alternative causes).
- SAFE MEDICATIONS: Drugs not associated with hepatotoxicity.

=== NARANJO QUESTIONS & DECISION RULES ===

Q3 (Dechallenge - improvement on discontinuation): Did the adverse reaction improve when the drug was discontinued?
- Use the Q3 HELPER data which defines the exact evaluation windows and pre-computed results.
- For EACH ICI exposure period, there is a specific "dechallenge evaluation window":
  Window = (period END + 3 days) to (next period START - 1 day), or to end of data if no next period.
  Grades BEFORE this window (on stop day or within 2 days after) are EXCLUDED — drug still active.
  Grades AFTER this window (during or after next period) are EXCLUDED — belong to next period's evaluation.
- Steps for each window:
  Step 1: Check Q3 HELPER. If it says "No grade data in this window" → this window is UNEVALUABLE.
  Step 2: If grades exist in window, compare with grade at period end (provided in Q3 HELPER).
  Step 3: If grade in window is LOWER than grade at period end = IMPROVED.
  Step 4: If grade in window is HIGHER than or EQUAL to grade at period end = NOT IMPROVED.
- Decision (FOLLOW STRICTLY — check in this exact order):
  1. If ANY window shows IMPROVED (grade decreased) = YES. Stop here.
  2. If at least one window has grade data AND all such windows show NOT IMPROVED = NO. Stop here.
  3. If NO window has any grade data (all windows are UNEVALUABLE) = Unknown. Stop here.
- CRITICAL: You can ONLY answer NO when you have actual grade data showing no decrease. NO grade data = Unknown, NEVER No.

Q4 (Rechallenge): Did the adverse reaction appear when the drug was re-administered?
- NOTE: Q4 has its OWN rules independent from Q3 and Q5. Do NOT apply Q5's temporal proximity logic or Q3's dechallenge window logic here.
- If NOT re-administered (single exposure period only) = Unknown.
- If re-administered (multiple exposure periods), use the Q4 HELPER data and follow these steps:
  Step 1: Identify each rechallenge period's END date (the last day of drug administration). Use the "Rechallenge period end day" from Q4 HELPER.
  Step 2: Find grade increases that occurred AFTER the rechallenge period END date.
  Step 3: Calculate "days after rechallenge END" = grade increase day - rechallenge period END day. Use the pre-computed value from Q4 HELPER.
  Step 4: Determine reliability based on gap from rechallenge END date (NOT start date):
    - If days after rechallenge END <= 2 = UNRELIABLE (drug still active, grade may reflect ongoing exposure) = Unknown.
    - If days after rechallenge END >= 3 (clear gap after drug was stopped) = RELIABLE = YES.
    - If re-administered but no grade increase occurred after rechallenge end = NO.
- CRITICAL: Always measure the gap from the rechallenge period END date, NOT the start date. The end date is when the drug was last administered in that period.

Q5 (Alternative causes): Are there alternative causes that could have caused the reaction?
- Focus on the hepatotoxicity EVENT: the first time grade reaches >= 3 (severe). If no grade >= 3 exists, use the first grade increase above 0.
- IMPORTANT FOR Q5: Consider ALL ICI exposure periods. Do NOT only look at Period 1.
- Use the Q5 HELPER data which provides pre-computed distances. USE these values directly — do NOT recalculate.
- KEY CONCEPT: "Distance to event" = event day MINUS the drug's LAST DOSE day (end day).
  Example: If a toxic drug was administered Day 2 to Day 31 and event is Day 31, the distance is 31 - 31 = 0 days (NOT 29 days).
  The drug's administration duration (start to end) is IRRELEVANT. Only the END day matters for distance calculation.
- Decision (use Q5 HELPER distances directly):
  If a toxic drug's distance to event is SMALLER than or SIMILAR to the ICI drug's distance = YES (alternative cause plausible).
  If the ICI drug's distance to event is SIGNIFICANTLY smaller than ALL toxic drugs = NO (alternative cause unlikely).
  If no toxic drugs exist or no timing data is available for toxic drugs = NO.
  If timing data is insufficient to compare = Unknown.
- NOTE: "Similar" means within approximately 7 days. "Significantly smaller" means at least 14 days difference.
- WARNING (Q5-specific): This question is about temporal proximity ONLY. The Q3 rule about "ignoring grades near discontinuation" does NOT apply here.

=== OUTPUT FORMAT (Chain-of-Thought) ===
IMPORTANT: Write reasoning FIRST, then derive the answer from your reasoning.
PROFESSIONAL TONE: In your reasoning, only mention drugs with complete and reliable timing information. Do NOT mention drugs with unknown or missing timing data. Focus only on the evidence you can verify.
Output ONLY valid JSON:
{
  "answers": [
    {"question": 3, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 4, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 5, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"}
  ]
}`;

/**
 * Create a prompt for LocalAI to analyze patient data
 * @param {Object} patientData - Patient medical data
 * @returns {string} Formatted prompt
 */
function createNaranjoPrompt(patientData) {
    const sanitizedData = {
        drugs: patientData.drugs || [],
        iciDrugs: patientData.iciDrugs || [],
        toxicDrugs: patientData.toxicDrugs || [],
        safeDrugs: patientData.safeDrugs || [],
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0,
        drugTimeline: patientData.drugTimeline || {},
        iciExposurePeriods: patientData.iciExposurePeriods || {},
        toxicExposurePeriods: patientData.toxicExposurePeriods || {},
        gradeChanges: patientData.gradeChanges || []
    };

    // Format ICI drug exposure with multiple periods (for rechallenge detection)
    // Data now comes from DrugChart which calculates accurate effect duration
    let hasRechallenge = false;
    const iciEvents = sanitizedData.iciDrugs.map(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            if (periods.length > 1) {
                hasRechallenge = true;
            }
            const periodsStr = periods.map((p, i) => {
                // Use dates if available (from DrugChart), otherwise just days
                const dateInfo = p.startDate && p.endDate
                    ? ` (${p.startDate} ~ ${p.endDate})`
                    : '';
                return `  Period ${i + 1}: Day ${p.start} to Day ${p.end}${dateInfo}`;
            }).join('\n');
            const rechallengeNote = periods.length > 1
                ? ` *** RECHALLENGE: Drug was STOPPED after Period 1, then RE-ADMINISTERED in Period 2 ***`
                : '';
            return `- ${drug}:${rechallengeNote}\n${periodsStr}`;
        }
        // Fallback to simple timeline
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) {
            return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        }
        return `- ${drug}: exposure period unknown`;
    }).join('\n') || '- No ICI drugs found';

    // Add explicit rechallenge summary for Q4
    const rechallengeSummary = hasRechallenge
        ? `\n\n*** IMPORTANT FOR Q4: RECHALLENGE OCCURRED ***
The ICI drug was stopped and then re-administered. Check if hepatotoxicity grade increased after re-administration.`
        : `\n\n*** FOR Q4: NO RECHALLENGE ***
The ICI drug was given continuously without being stopped and restarted. Answer "Unknown" for Q4.`;

    // Format grade timeline as events
    const gradeEvents = sanitizedData.gradeChanges.length > 0
        ? sanitizedData.gradeChanges.map(g => `- Day ${g.day}: Grade ${g.grade}`).join('\n')
        : '- No grade data available';

    // Format toxic drugs with individual exposure periods
    const toxicDrugs = sanitizedData.toxicDrugs || [];
    const toxicDrugsWithTimeline = toxicDrugs.map(drug => {
        const periods = sanitizedData.toxicExposurePeriods[drug];
        if (periods && periods.length > 0) {
            if (periods.length === 1) {
                return `- ${drug}: Day ${periods[0].start} to Day ${periods[0].end}`;
            }
            const periodsStr = periods.map((p, i) =>
                `  Period ${i + 1}: Day ${p.start} to Day ${p.end}`
            ).join('\n');
            return `- ${drug} (${periods.length} separate periods):\n${periodsStr}`;
        }
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        return `- ${drug}: timing unknown`;
    }).join('\n');
    const toxicDrugsStr = toxicDrugs.length > 0
        ? toxicDrugsWithTimeline
        : 'None';

    // Format safe drugs (non-hepatotoxic medications) - just list, no timeline needed
    const safeDrugs = sanitizedData.safeDrugs || [];
    const safeDrugsStr = safeDrugs.length > 0
        ? safeDrugs.join(', ')
        : 'None';

    // Pre-compute event day and sorted grades for HELPER data
    const sortedGrades = [...sanitizedData.gradeChanges].sort((a, b) => a.day - b.day);
    let eventDay = null;
    const severeGrade = sortedGrades.find(g => g.grade >= 3);
    if (severeGrade) {
        eventDay = severeGrade.day;
    } else {
        const firstIncrease = sortedGrades.find(g => g.grade > 0);
        if (firstIncrease) eventDay = firstIncrease.day;
    }

    // Q3 HELPER: Pre-compute dechallenge evaluation windows
    let q3Helper = '';
    sanitizedData.iciDrugs.forEach(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            q3Helper += `\nQ3 HELPER (pre-computed — use these windows for Q3):`;
            for (let i = 0; i < periods.length; i++) {
                const period = periods[i];
                const windowStart = period.end + 3;
                const windowEnd = (i + 1 < periods.length) ? periods[i + 1].start - 1 : sanitizedData.totalDays;
                const windowLabel = `Period ${i + 1} dechallenge window`;

                if (windowStart > windowEnd) {
                    q3Helper += `\n- ${drug} ${windowLabel}: NO WINDOW — UNEVALUABLE (Period ${i + 1} end Day ${period.end} → Period ${i + 2} start Day ${periods[i + 1]?.start || 'N/A'}, gap too small)`;
                    continue;
                }

                q3Helper += `\n- ${drug} ${windowLabel}: Day ${windowStart} to Day ${windowEnd} (after Period ${i + 1} end Day ${period.end}, excluding 2 days)`;

                const gradesInWindow = sortedGrades.filter(g => g.day >= windowStart && g.day <= windowEnd);
                if (gradesInWindow.length > 0) {
                    const gradeList = gradesInWindow.map(g => `Day ${g.day}: Grade ${g.grade}`).join(', ');
                    q3Helper += `\n  Grades in window: ${gradeList}`;
                    const gradeBeforeWindow = sortedGrades.filter(g => g.day <= period.end).sort((a, b) => b.day - a.day)[0];
                    const lastInWindow = gradesInWindow[gradesInWindow.length - 1];
                    if (gradeBeforeWindow) {
                        q3Helper += `\n  Grade at period end: Day ${gradeBeforeWindow.day} Grade ${gradeBeforeWindow.grade}`;
                        if (lastInWindow.grade < gradeBeforeWindow.grade) {
                            q3Helper += `\n  *** IMPROVED: Grade decreased from ${gradeBeforeWindow.grade} to ${lastInWindow.grade} ***`;
                        } else if (lastInWindow.grade > gradeBeforeWindow.grade) {
                            q3Helper += `\n  Grade WORSENED: ${gradeBeforeWindow.grade} → ${lastInWindow.grade}`;
                        } else {
                            q3Helper += `\n  Grade UNCHANGED: ${gradeBeforeWindow.grade} → ${lastInWindow.grade}`;
                        }
                    }
                } else {
                    q3Helper += `\n  *** NO GRADE DATA in this window — UNEVALUABLE (cannot determine improvement or worsening) ***`;
                }
            }
        }
    });

    // Q4 HELPER: Pre-compute rechallenge data
    let q4Helper = '';
    if (hasRechallenge && eventDay !== null) {
        q4Helper = `\nQ4 HELPER (pre-computed — use these values for Q4):`;
        sanitizedData.iciDrugs.forEach(drug => {
            const periods = sanitizedData.iciExposurePeriods[drug];
            if (periods && periods.length > 1) {
                for (let i = 1; i < periods.length; i++) {
                    const rechallengePeriod = periods[i];
                    const rechallengeEnd = rechallengePeriod.end;
                    q4Helper += `\n- ${drug} rechallenge Period ${i + 1}: END Day ${rechallengeEnd}`;

                    const gradesAfterEnd = sortedGrades.filter(g => g.day > rechallengeEnd && g.grade > 0);
                    if (gradesAfterEnd.length > 0) {
                        const firstGradeAfter = gradesAfterEnd[0];
                        const daysAfterEnd = firstGradeAfter.day - rechallengeEnd;
                        q4Helper += `\n  First grade increase after rechallenge END: Day ${firstGradeAfter.day} (Grade ${firstGradeAfter.grade})`;
                        q4Helper += `\n  Days after rechallenge END: ${daysAfterEnd} days`;
                        q4Helper += daysAfterEnd <= 2
                            ? `\n  *** UNRELIABLE: Only ${daysAfterEnd} day(s) after rechallenge END — drug still active ***`
                            : `\n  Reliable: ${daysAfterEnd} days after rechallenge END`;
                    } else {
                        const gradesDuring = sortedGrades.filter(g => g.day >= rechallengePeriod.start && g.day <= rechallengeEnd && g.grade > 0);
                        if (gradesDuring.length > 0) {
                            q4Helper += `\n  Grade increase occurred DURING rechallenge (Day ${gradesDuring[0].day}, Grade ${gradesDuring[0].grade}) — UNRELIABLE`;
                        } else {
                            q4Helper += `\n  No grade increase found after rechallenge END`;
                        }
                    }
                }
            }
        });
    }

    // Q5 HELPER: Pre-compute temporal proximity for alternative causes
    // Helper function: find the most recent dose day of a toxic drug BEFORE or AT the event
    function getToxicLastDoseBeforeEvent(drug, evDay) {
        const periods = sanitizedData.toxicExposurePeriods[drug];
        if (periods && periods.length > 0) {
            let lastDose = null;
            for (const p of periods) {
                if (p.end <= evDay) {
                    lastDose = p.end;
                } else if (p.start <= evDay) {
                    lastDose = evDay;
                }
            }
            return lastDose;
        }
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) {
            return timeline.endDay <= evDay ? timeline.endDay : (timeline.startDay <= evDay ? evDay : null);
        }
        return null;
    }

    let mostRecentIciDay = null;
    let mostRecentIciDrug = null;
    sanitizedData.iciDrugs.forEach(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods) {
            periods.forEach(p => {
                if (eventDay === null || p.end <= eventDay) {
                    if (mostRecentIciDay === null || p.end > mostRecentIciDay) {
                        mostRecentIciDay = p.end;
                        mostRecentIciDrug = drug;
                    }
                }
            });
        }
    });

    let q5Helper = '';
    if (eventDay !== null && mostRecentIciDay !== null) {
        const iciToEvent = eventDay - mostRecentIciDay;
        q5Helper = `\nQ5 HELPER (pre-computed distances — use these directly, do NOT recalculate):
- Event day (first grade >= 3): Day ${eventDay}
- ICI last dose: Day ${mostRecentIciDay} (${mostRecentIciDrug}) → distance to event = ${eventDay} - ${mostRecentIciDay} = ${iciToEvent} days`;

        toxicDrugs.forEach(drug => {
            const lastDose = getToxicLastDoseBeforeEvent(drug, eventDay);
            const periods = sanitizedData.toxicExposurePeriods[drug];
            if (lastDose !== null) {
                const toxicToEvent = eventDay - lastDose;
                const periodsInfo = periods && periods.length > 1
                    ? ` (${periods.length} periods: ${periods.map(p => `Day ${p.start}-${p.end}`).join(', ')})`
                    : '';
                q5Helper += `\n- ${drug} last dose before event: Day ${lastDose}${periodsInfo} → distance to event = ${eventDay} - ${lastDose} = ${toxicToEvent} days`;
            } else {
                q5Helper += `\n- ${drug}: no administration before event`;
            }
        });

        q5Helper += `\n- SUMMARY: ICI distance = ${iciToEvent} days`;
        const toxicDistances = [];
        toxicDrugs.forEach(drug => {
            const lastDose = getToxicLastDoseBeforeEvent(drug, eventDay);
            if (lastDose !== null) {
                toxicDistances.push(`${drug} = ${eventDay - lastDose} days`);
            }
        });
        if (toxicDistances.length > 0) {
            q5Helper += `, Toxic distances: ${toxicDistances.join(', ')}`;
        }
    }

    // Build the user prompt with structured data
    const prompt = `=== PATIENT DATA ===

ICI DRUG EXPOSURE:
${iciEvents}
${rechallengeSummary}

HEPATOTOXICITY GRADE CHANGES:
${gradeEvents}

TOXIC MEDICATIONS (potential hepatotoxic - consider for Q5 alternative causes):
${toxicDrugsStr}
(Total: ${toxicDrugs.length} toxic drugs)

SAFE MEDICATIONS (non-hepatotoxic):
${safeDrugsStr}

TOTAL DURATION: ${sanitizedData.totalDays} days
${q3Helper}
${q4Helper}
${q5Helper}

=== TASK ===
Based ONLY on the data above, answer Q3, Q4, Q5 using the decision rules.
Output JSON only.`;

    return prompt;
}

/**
 * Call LocalAI API for Naranjo reasoning
 * @param {Object} patientData - Patient medical data
 * @returns {Promise<Object>} AI reasoning result
 */
export async function getNaranjoReasoning(patientData) {
    // Start total timing
    const totalStartTime = performance.now();
    console.log('=== AI Reasoning Timing Start ===');

    // Use mock AI if enabled
    if (OLLAMA_CONFIG.useMockAI) {
        console.log('Using Mock AI (LocalAI is disabled)');
        return getMockNaranjoReasoning(patientData);
    }

    // Step 1: Data preparation
    const dataStartTime = performance.now();
    console.log('Patient data sent to AI:', patientData);
    const prompt = createNaranjoPrompt(patientData);
    const dataEndTime = performance.now();
    console.log(`[TIMING] Step 1 - Data Preparation & Prompt Generation: ${(dataEndTime - dataStartTime).toFixed(2)}ms`);

    console.log('=== Full Generated Prompt ===');
    console.log(prompt);
    console.log('=============================');

    const requestBody = {
        model: OLLAMA_CONFIG.model,
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.1,
        max_tokens: OLLAMA_CONFIG.maxTokens,
        top_p: 0.9
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

        // Step 2: API Request (LLM Inference)
        const apiStartTime = performance.now();
        console.log('[TIMING] Step 2 - Sending request to LLM...');

        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const apiEndTime = performance.now();
        console.log(`[TIMING] Step 2 - LLM Inference Time: ${(apiEndTime - apiStartTime).toFixed(2)}ms (${((apiEndTime - apiStartTime) / 1000).toFixed(2)}s)`);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        // Step 3: Response Parsing
        const parseStartTime = performance.now();
        const result = await response.json();
        console.log('Ollama raw result:', result);

        // Extract the AI's response
        const aiResponse = result.choices?.[0]?.message?.content;

        if (!aiResponse) {
            console.error('Invalid Ollama response structure:', JSON.stringify(result, null, 2));
            throw new Error('Invalid response format from Ollama');
        }

        console.log('AI response content:', aiResponse);

        // Parse the JSON response from AI
        const parsedResponse = parseAIResponse(aiResponse);
        const parseEndTime = performance.now();
        console.log(`[TIMING] Step 3 - Response Parsing: ${(parseEndTime - parseStartTime).toFixed(2)}ms`);

        // Step 4: Merge with fixed answers
        const mergeStartTime = performance.now();
        const mergedResponse = mergeWithFixedAnswers(parsedResponse);
        const mergeEndTime = performance.now();
        console.log(`[TIMING] Step 4 - Merge with Fixed Answers: ${(mergeEndTime - mergeStartTime).toFixed(2)}ms`);

        // Total time
        const totalEndTime = performance.now();
        console.log('=== AI Reasoning Timing Summary ===');
        console.log(`[TIMING] Step 1 - Data Preparation: ${(dataEndTime - dataStartTime).toFixed(2)}ms`);
        console.log(`[TIMING] Step 2 - LLM Inference: ${(apiEndTime - apiStartTime).toFixed(2)}ms (${((apiEndTime - apiStartTime) / 1000).toFixed(2)}s)`);
        console.log(`[TIMING] Step 3 - Response Parsing: ${(parseEndTime - parseStartTime).toFixed(2)}ms`);
        console.log(`[TIMING] Step 4 - Merge Answers: ${(mergeEndTime - mergeStartTime).toFixed(2)}ms`);
        console.log(`[TIMING] TOTAL TIME: ${(totalEndTime - totalStartTime).toFixed(2)}ms (${((totalEndTime - totalStartTime) / 1000).toFixed(2)}s)`);
        console.log('===================================');

        return {
            success: true,
            data: mergedResponse,
            rawResponse: aiResponse,
            timestamp: new Date().toISOString(),
            timing: {
                dataPreparation: dataEndTime - dataStartTime,
                llmInference: apiEndTime - apiStartTime,
                responseParsing: parseEndTime - parseStartTime,
                mergeAnswers: mergeEndTime - mergeStartTime,
                total: totalEndTime - totalStartTime
            }
        };

    } catch (error) {
        const totalEndTime = performance.now();
        console.error('LocalAI API error:', error);
        console.log(`[TIMING] FAILED after ${(totalEndTime - totalStartTime).toFixed(2)}ms`);

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            timing: {
                total: totalEndTime - totalStartTime
            }
        };
    }
}

/**
 * Merge AI answers with fixed answers
 * @param {Object} aiResponse - Parsed AI response (questions 3, 4, 5)
 * @returns {Object} Complete response with all 10 questions
 */
function mergeWithFixedAnswers(aiResponse) {
    // Create array for all 10 answers
    const allAnswers = [];

    for (let i = 1; i <= 10; i++) {
        if (FIXED_ANSWERS[i]) {
            // Use fixed answer
            allAnswers.push({
                question: i,
                ...FIXED_ANSWERS[i]
            });
        } else {
            // Find AI answer for this question
            const aiAnswer = aiResponse.answers?.find(a => a.question === i);
            if (aiAnswer) {
                allAnswers.push(aiAnswer);
            } else {
                // Fallback if AI didn't provide answer
                allAnswers.push({
                    question: i,
                    answer: 'Unknown',
                    reasoning: 'No AI response available',
                    confidence: 'Low'
                });
            }
        }
    }

    return {
        answers: allAnswers,
        parseError: aiResponse.parseError
    };
}

/**
 * Parse AI response and extract structured data
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed response (3 AI answers)
 */
function parseAIResponse(response) {
    try {
        // Remove markdown code blocks if present
        let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Try to extract JSON from the response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Raw AI response:', response);
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!parsed.answers || !Array.isArray(parsed.answers)) {
            throw new Error('Invalid response structure: missing answers array');
        }

        // Validate we have the expected AI questions (3, 4, 5)
        // Note: Gemma model may return question as string ("3") instead of number (3)
        const expectedQuestions = [3, 4, 5];
        parsed.answers = parsed.answers
            .map(item => ({
                ...item,
                question: typeof item.question === 'string' ? parseInt(item.question, 10) : item.question
            }))
            .filter(item =>
                item && expectedQuestions.includes(item.question)
            );

        if (parsed.answers.length === 0) {
            console.warn('No valid AI answers found');
        }

        return parsed;

    } catch (error) {
        console.error('Failed to parse AI response:', error);

        // Return fallback structure for AI questions only
        return {
            answers: [3, 4, 5].map(qNum => ({
                question: qNum,
                answer: 'Unknown',
                reasoning: 'Failed to parse AI response',
                confidence: 'Low'
            })),
            parseError: error.message
        };
    }
}

/**
 * Convert AI answer to code format used in the app
 * @param {string} answer - AI answer (Yes/No/Unknown)
 * @returns {string} Code format (yes/no/don't know)
 */
export function convertAnswerToCode(answer) {
    const normalized = answer.toLowerCase().trim();

    if (normalized === 'yes') return 'yes';
    if (normalized === 'no') return 'no';
    return "don't know";
}

/**
 * Health check for Ollama service
 * @returns {Promise<boolean>} True if service is available
 */
export async function checkOllamaHealth() {
    // Always return true if using mock AI
    if (OLLAMA_CONFIG.useMockAI) {
        console.log('Using Mock AI - health check passed');
        return mockHealthCheck();
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(getHealthCheckUrl(), {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        return response.ok;

    } catch (error) {
        console.error('Ollama health check failed:', error);
        return false;
    }
}
