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
- Keep each answer brief (2-3 sentences). You MUST answer ALL 3 questions (Q3, Q4, Q5).

=== INPUT DATA DESCRIPTION ===
- ICI DRUG EXPOSURE: Immune checkpoint inhibitor drugs with exposure periods. Multiple periods = rechallenge (drug was stopped then restarted).
- HEPATOTOXICITY GRADE CHANGES: Timeline of liver injury severity (Grade 0=none, 1=mild, 2=moderate, 3=severe, 4=life-threatening).
- TOXIC MEDICATIONS: Other drugs known to cause hepatotoxicity (potential alternative causes).

=== NARANJO QUESTIONS & DECISION RULES ===

Q3 (Dechallenge - improvement on discontinuation): Did the adverse reaction improve when the drug was discontinued?
- Use the Q3 HELPER data which defines the exact evaluation windows and pre-computed results.
- PREREQUISITE: An adverse event (grade > 0) must have occurred DURING the ICI exposure period to evaluate dechallenge.
  If no event occurred during a period, that period's dechallenge is UNEVALUABLE.
- For EACH ICI exposure period where an event occurred, there is a "dechallenge evaluation window":
  Window = (period END + 5 days) to (next period START - 1 day), or to end of data if no next period.
  If the window length is 10 days or less, the period is TOO SHORT to evaluate dechallenge effect → UNEVALUABLE.
- Steps for each window:
  Step 1: Check Q3 HELPER. If no event in period, window TOO SHORT (≤10 days), or no grade data in window → UNEVALUABLE.
  Step 2: If grades exist in window, compare with grade at period end (provided in Q3 HELPER).
  Step 3: If grade in window is LOWER than grade at period end = IMPROVED.
  Step 4: SPECIAL CASE: If grade at period end is 0 AND grade in window is also 0 = IMPROVED (reaction resolved during treatment and sustained after dechallenge).
  Step 5: If grade in window is HIGHER than or EQUAL to grade at period end (and not the 0→0 case above) = NOT IMPROVED.
- Decision (FOLLOW STRICTLY — check in this exact order):
  1. If ANY window shows IMPROVED (event in period + grade decreased in window) = YES. Stop here.
  2. If at least one window has grade data AND all such windows show NOT IMPROVED = NO. Stop here.
  3. If all windows are UNEVALUABLE (no event in period, or no grade data in window) = Unknown. Stop here.
- CRITICAL: You can ONLY answer NO when an event occurred during the period AND grade data in the window shows no decrease.
- Check the OVERALL CONCLUSION in Q3 HELPER for the final pre-computed answer.

Q4 (Rechallenge): Did the adverse reaction appear when the drug was re-administered?
- NOTE: Q4 has its OWN rules independent from Q3 and Q5.
- If NOT re-administered (single exposure period only) = Unknown.
- If re-administered (multiple exposure periods), use the Q4 HELPER which shows which periods had events (grade > 0).
- "Recur" means: the adverse event must have appeared in an earlier period AND appeared again in a later period.
- Per-drug decision:
    - If 2 or more periods had events = YES (event appeared and recurred after re-administration).
    - If event occurred in an earlier period but NOT in any later period = NO (event did not recur).
    - If event only occurred in the last period (no prior event) or no events at all = Unknown.
- CRITICAL: "No prior event" means you CANNOT determine rechallenge effect. Answer MUST be Unknown, NEVER No. You can ONLY answer No when an earlier period HAD an event but a later period did NOT.
- MULTIPLE ICI DRUGS: If multiple ICI drugs exist, evaluate each separately. The OVERALL answer follows priority: YES > NO > Unknown. If ANY drug shows YES → overall YES. Check the Q4 HELPER OVERALL CONCLUSION.

Q5 (Alternative causes): Are there alternative causes that could have caused the reaction?
- IMPORTANT: Evaluate ALL hepatotoxicity events (every grade > 0 occurrence), not just the first one.
- Use the Q5 HELPER data which provides pre-computed distances for EACH event. USE these values directly — do NOT recalculate.
- The Q5 HELPER shows whether each event occurred DURING drug administration or AFTER it, with pre-computed distances.
- Decision (use Q5 HELPER directly):
  If ANY event has a toxic drug with distance ≤ ICI distance + 7 days = YES (alternative cause plausible for at least one event).
  If no toxic drugs exist = NO.
  If ALL events show ICI distance significantly smaller than all toxic drugs = NO.
  If timing data is insufficient to compare = Unknown.
- Check the OVERALL SUMMARY in Q5 HELPER for the final pre-computed conclusion.

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
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0,
        drugTimeline: patientData.drugTimeline || {},
        iciExposurePeriods: patientData.iciExposurePeriods || {},
        toxicExposurePeriods: patientData.toxicExposurePeriods || {},
        gradeChanges: patientData.gradeChanges || [],
        allGradeData: patientData.allGradeData || []
    };

    // Format ICI drug exposure with multiple periods (for rechallenge detection)
    let hasRechallenge = false;
    const iciEvents = sanitizedData.iciDrugs.map(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            if (periods.length > 1) hasRechallenge = true;
            const periodsStr = periods.map((p, i) => {
                const dateInfo = p.startDate && p.endDate ? ` (${p.startDate} ~ ${p.endDate})` : '';
                return `  Period ${i + 1}: Day ${p.start} to Day ${p.end}${dateInfo}`;
            }).join('\n');
            const rechallengeNote = periods.length > 1
                ? ` *** RECHALLENGE: Drug was administered ${periods.length} times ***`
                : '';
            return `- ${drug}:${rechallengeNote}\n${periodsStr}`;
        }
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        return `- ${drug}: exposure period unknown`;
    }).join('\n') || '- No ICI drugs found';

    const rechallengeSummary = hasRechallenge
        ? `\n\n*** RECHALLENGE OCCURRED: The ICI drug was administered multiple times. ***`
        : `\n\n*** NO RECHALLENGE: The ICI drug was administered only once. ***`;

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

    // Pre-compute ALL event days and sorted grades for HELPER data
    const sortedGrades = [...sanitizedData.gradeChanges].sort((a, b) => a.day - b.day);
    const allEventDays = sortedGrades.filter(g => g.grade > 0);

    // Q3 HELPER: Pre-compute dechallenge evaluation windows
    // Use allGradeData (not deduplicated) to check for measurements in windows
    const allGrades = sanitizedData.allGradeData;
    let q3Helper = '';
    const q3WindowResults = []; // Track per-window results for overall conclusion
    sanitizedData.iciDrugs.forEach(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (!periods || periods.length === 0) return;

        let unevaluableCount = 0;
        let evaluableDetails = [];

        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            const pEnd = Number(period.end);
            const windowStart = pEnd + 5;
            const windowEnd = (i + 1 < periods.length) ? Number(periods[i + 1].start) - 1 : sanitizedData.totalDays;
            const windowLength = windowEnd - windowStart;

            if (windowStart > windowEnd) {
                unevaluableCount++;
                q3WindowResults.push('UNEVALUABLE');
                continue;
            }

            // Check if event (grade > 0) occurred during ANY period up to the current one
            const firstPeriodStart = Number(periods[0].start);
            const eventsInBlock = allGrades.filter(g => g.day >= firstPeriodStart && g.day <= pEnd && g.grade > 0);
            if (eventsInBlock.length === 0) {
                unevaluableCount++;
                q3WindowResults.push('UNEVALUABLE');
                continue;
            }

            if (windowLength <= 10) {
                unevaluableCount++;
                q3WindowResults.push('UNEVALUABLE');
                continue;
            }

            // This window is evaluable — collect details
            let detail = `- ${drug} Period ${i + 1} dechallenge window: Day ${windowStart} to Day ${windowEnd} (${windowLength} days)`;

            const allGradesInWindow = allGrades.filter(g => g.day >= windowStart && g.day <= windowEnd);
            const gradeBeforeWindow = sortedGrades.filter(g => g.day <= pEnd).sort((a, b) => b.day - a.day)[0];

            if (allGradesInWindow.length > 0) {
                const gradeList = allGradesInWindow.map(g => `Day ${g.day}: Grade ${g.grade}`).join(', ');
                detail += `\n  Grades in window: ${gradeList}`;
                const lastInWindow = allGradesInWindow[allGradesInWindow.length - 1];
                if (gradeBeforeWindow) {
                    detail += `\n  Grade at period end: Day ${gradeBeforeWindow.day} Grade ${gradeBeforeWindow.grade}`;
                    if (lastInWindow.grade < gradeBeforeWindow.grade) {
                        detail += `\n  *** IMPROVED: Grade decreased from ${gradeBeforeWindow.grade} to ${lastInWindow.grade} → YES ***`;
                        q3WindowResults.push('YES');
                    } else if (lastInWindow.grade > gradeBeforeWindow.grade) {
                        detail += `\n  NOT IMPROVED: Grade worsened from ${gradeBeforeWindow.grade} to ${lastInWindow.grade} → NO`;
                        q3WindowResults.push('NO');
                    } else if (Number(gradeBeforeWindow.grade) === 0 && Number(lastInWindow.grade) === 0) {
                        detail += `\n  *** IMPROVED: Grade 0 maintained after dechallenge (resolved during treatment and sustained) → YES ***`;
                        q3WindowResults.push('YES');
                    } else {
                        detail += `\n  NOT IMPROVED: Grade unchanged at ${gradeBeforeWindow.grade} → NO`;
                        q3WindowResults.push('NO');
                    }
                } else {
                    q3WindowResults.push('UNEVALUABLE');
                }
            } else {
                detail += `\n  NO GRADE DATA in this window → UNEVALUABLE`;
                q3WindowResults.push('UNEVALUABLE');
            }
            evaluableDetails.push(detail);
        }

        // Build concise output: summary of unevaluable + details of evaluable only
        q3Helper += `\nQ3 HELPER (pre-computed — use these windows for Q3):`;
        q3Helper += `\n${drug}: ${periods.length} periods total.`;
        if (unevaluableCount > 0) {
            q3Helper += ` ${unevaluableCount} periods have no evaluable dechallenge window (no gap or too short).`;
        }
        if (evaluableDetails.length > 0) {
            q3Helper += `\nEvaluable windows:\n${evaluableDetails.join('\n')}`;
        } else {
            q3Helper += `\nNo evaluable dechallenge windows found.`;
        }
    });
    // Add OVERALL CONCLUSION to Q3 HELPER
    const overallQ3 = q3WindowResults.includes('YES') ? 'YES' : q3WindowResults.includes('NO') ? 'NO' : 'Unknown';
    if (q3Helper) {
        q3Helper += `\n\n- OVERALL CONCLUSION: ${overallQ3} (Priority: YES if any window improved > NO if any window has data but not improved > Unknown if all unevaluable)`;
    }

    // Q4 HELPER: Pre-compute rechallenge evaluation using iciExposurePeriods (pre-split by dose days)
    let q4Helper = '';
    if (hasRechallenge && allEventDays.length > 0) {
        q4Helper = `\nQ4 HELPER (pre-computed — use these values for Q4):`;
        const q4DrugResults = []; // Track per-drug results for overall conclusion
        sanitizedData.iciDrugs.forEach(drug => {
            const periods = sanitizedData.iciExposurePeriods[drug];
            if (!periods || periods.length < 2) return;

            const periodResults = periods.map((period, idx) => {
                const eventsInPeriod = allGrades.filter(g => g.day >= period.start && g.day <= period.end && g.grade > 0);
                return { period: idx + 1, start: period.start, end: period.end, hasEvent: eventsInPeriod.length > 0, maxGrade: eventsInPeriod.length > 0 ? Math.max(...eventsInPeriod.map(g => g.grade)) : 0 };
            });

            q4Helper += `\n- ${drug}: ${periods.length} periods (rechallenge)`;
            periodResults.forEach(pe => {
                q4Helper += `\n  Period ${pe.period} (Day ${pe.start}–${pe.end}): ${pe.hasEvent ? `Event occurred (max grade ${pe.maxGrade})` : 'No event'}`;
            });

            const periodsWithEvent = periodResults.filter(pe => pe.hasEvent);
            if (periodsWithEvent.length >= 2) {
                q4Helper += `\n  *** Events in ${periodsWithEvent.length} periods (${periodsWithEvent.map(pe => `Period ${pe.period}`).join(', ')}) → YES ***`;
                q4DrugResults.push('YES');
            } else if (periodsWithEvent.length === 1) {
                const eventIdx = periodResults.indexOf(periodsWithEvent[0]);
                if (eventIdx < periodResults.length - 1) {
                    q4Helper += `\n  Event in Period ${periodsWithEvent[0].period} but NOT in later periods → NO`;
                    q4DrugResults.push('NO');
                } else {
                    q4Helper += `\n  *** Event only in last period (Period ${periodsWithEvent[0].period}), NO prior event → ANSWER: Unknown (NOT No — cannot determine rechallenge without prior event) ***`;
                    q4DrugResults.push('Unknown');
                }
            } else {
                q4Helper += `\n  *** No events in any period → ANSWER: Unknown ***`;
                q4DrugResults.push('Unknown');
            }
        });
        // Overall conclusion across all ICI drugs (priority: YES > NO > Unknown)
        const overallQ4 = q4DrugResults.includes('YES') ? 'YES' : q4DrugResults.includes('NO') ? 'NO' : 'Unknown';
        q4Helper += `\n\n- OVERALL CONCLUSION: ${overallQ4}${q4DrugResults.length > 1 ? ` (priority: YES > NO > Unknown across ${q4DrugResults.length} drugs)` : ''}`;
    }

    // Q5 HELPER: Pre-compute temporal proximity for alternative causes
    // Helper function: check if event occurred during drug administration
    function getDrugEventRelation(drug, evDay, useExposurePeriods) {
        const periods = useExposurePeriods ? sanitizedData.toxicExposurePeriods[drug] : sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            // Check if event occurred DURING any administration period
            for (const p of periods) {
                if (Number(p.start) <= evDay && Number(p.end) >= evDay) {
                    return { distance: 0, duringAdmin: true, period: p };
                }
            }
            // Event occurred after administration — find closest period that ended before event
            let closestEnd = null;
            for (const p of periods) {
                if (Number(p.end) < evDay) {
                    if (closestEnd === null || Number(p.end) > Number(closestEnd.end)) {
                        closestEnd = p;
                    }
                }
            }
            if (closestEnd) {
                return { distance: evDay - Number(closestEnd.end), duringAdmin: false, period: closestEnd };
            }
            return null;
        }
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) {
            const start = Number(timeline.startDay);
            const end = Number(timeline.endDay);
            if (start <= evDay && end >= evDay) {
                return { distance: 0, duringAdmin: true, period: { start, end } };
            }
            if (end < evDay) {
                return { distance: evDay - end, duringAdmin: false, period: { start, end } };
            }
        }
        return null;
    }

    // Build Q5 helper string — evaluate ALL event days
    let q5Helper = '';
    if (allEventDays.length > 0 && toxicDrugs.length > 0) {
        q5Helper = `\nQ5 HELPER (pre-computed — use these directly, do NOT recalculate):`;
        q5Helper += `\n- Total events found: ${allEventDays.length} (all grade > 0 occurrences)`;

        let anyAlternativePlausible = false;

        allEventDays.forEach((event, idx) => {
            const evDay = event.day;
            q5Helper += `\n\n  [Event ${idx + 1}] Day ${evDay} (Grade ${event.grade}):`;

            // Find closest ICI relation for this event
            let iciRelation = null;
            let iciDrugName = null;
            sanitizedData.iciDrugs.forEach(drug => {
                const rel = getDrugEventRelation(drug, evDay, false);
                if (rel && (iciRelation === null || rel.distance < iciRelation.distance)) {
                    iciRelation = rel;
                    iciDrugName = drug;
                }
            });

            if (iciRelation) {
                if (iciRelation.duringAdmin) {
                    q5Helper += `\n    ICI (${iciDrugName}): DURING administration (Day ${iciRelation.period.start}~${iciRelation.period.end}) → distance = 0 days`;
                } else {
                    q5Helper += `\n    ICI (${iciDrugName}): ended Day ${iciRelation.period.end} → distance = ${iciRelation.distance} days`;
                }
            } else {
                q5Helper += `\n    ICI: not administered before this event`;
            }

            // Toxic drug relations for this event
            toxicDrugs.forEach(drug => {
                const rel = getDrugEventRelation(drug, evDay, true);
                if (rel) {
                    if (rel.duringAdmin) {
                        q5Helper += `\n    ${drug}: DURING administration (Day ${rel.period.start}~${rel.period.end}) → distance = 0 days`;
                    } else {
                        q5Helper += `\n    ${drug}: ended Day ${rel.period.end} → distance = ${rel.distance} days`;
                    }
                    // Check if this toxic drug is a plausible alternative for this event
                    if (iciRelation) {
                        if (rel.distance <= iciRelation.distance + 7) {
                            anyAlternativePlausible = true;
                            q5Helper += ` ← ALTERNATIVE PLAUSIBLE (toxic distance ≤ ICI distance + 7)`;
                        }
                    }
                }
            });
        });

        // Overall summary
        q5Helper += `\n\n- OVERALL SUMMARY: ${anyAlternativePlausible ? 'At least one event has a plausible alternative cause → YES' : 'No event has a plausible alternative cause → NO'}`;
    } else if (allEventDays.length > 0 && toxicDrugs.length === 0) {
        q5Helper = `\nQ5 HELPER: No toxic drugs exist → NO alternative causes`;
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

TOTAL DURATION: ${sanitizedData.totalDays} days
${q3Helper}
${q4Helper}
${q5Helper}

=== TASK ===
Based ONLY on the data above, answer Q3, Q4, Q5 using the decision rules.
You MUST answer ALL 3 questions. Keep reasoning brief (2-3 sentences each).
Output JSON ONLY in this EXACT format:
{"answers":[{"question":3,"reasoning":"...","answer":"Yes/No/Unknown","confidence":"..."},{"question":4,"reasoning":"...","answer":"Yes/No/Unknown","confidence":"..."},{"question":5,"reasoning":"...","answer":"Yes/No/Unknown","confidence":"..."}]}`;

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
    console.log(`[PROMPT SIZE] ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens) + system prompt ~${Math.ceil(SYSTEM_PROMPT.length / 4)} tokens = ~${Math.ceil((prompt.length + SYSTEM_PROMPT.length) / 4)} total tokens`);
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
        let mapped = parsed.answers
            .map(item => ({
                ...item,
                question: typeof item.question === 'string' ? parseInt(item.question, 10) : item.question
            }))
            .filter(item =>
                item && expectedQuestions.includes(item.question)
            );

        // If standard mapping fails, use order-based mapping (AI returns correct order but wrong numbers)
        if (mapped.length < expectedQuestions.length && parsed.answers.length >= expectedQuestions.length) {
            console.warn('[NARANJO PARSE] Question numbers mismatch, using order-based mapping');
            mapped = parsed.answers.slice(0, 3).map((item, idx) => ({
                ...item,
                question: expectedQuestions[idx]
            }));
        }

        parsed.answers = mapped;

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
