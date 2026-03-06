/**
 * WHO-UMC Causality Assessment AI Client
 * Completely independent from Naranjo - separate prompt, separate logic
 */

import { OLLAMA_CONFIG, getApiUrl, getHealthCheckUrl } from './config.js';
import { getMockNaranjoReasoning, mockHealthCheck } from './MockAIClient.js';

/**
 * WHO-UMC Questions
 */
export const WHO_UMC_QUESTIONS = [
    "Is the time interval between drug administration and adverse event onset pharmacologically plausible?",
    "Can the underlying disease or concomitant medications sufficiently explain the adverse event?",
    "Was there clinically reasonable improvement when the suspected drug was discontinued or reduced?",
    "Did the adverse event recur upon re-administration of the same drug?",
    "Is the adverse event a well-known specific pharmacological reaction to the drug?"
];

/**
 * System prompt for WHO-UMC causality assessment (independent from Naranjo)
 */
const SYSTEM_PROMPT = `You are a clinical pharmacology expert performing WHO-UMC causality assessment for drug-induced liver injury (DILI).

=== CRITICAL RULES ===
- DO NOT invent or fabricate any data
- Use ONLY the exact days, grades, and drug names given in the patient data
- If data is missing or unclear, answer "Unknown"

=== INPUT DATA DESCRIPTION ===
- ICI DRUG EXPOSURE: Immune checkpoint inhibitor drugs with exposure periods. Multiple periods = rechallenge (drug was stopped then restarted).
- HEPATOTOXICITY GRADE CHANGES: Timeline of liver injury severity (Grade 0=none, 1=mild, 2=moderate, 3=severe, 4=life-threatening).
- TOXIC MEDICATIONS: Other drugs known to cause hepatotoxicity (potential alternative causes).

=== WHO-UMC QUESTIONS & DECISION RULES ===

Q1 (Time interval plausibility): Is the time between ICI drug administration and hepatotoxicity onset pharmacologically plausible?
- Evaluate EACH ICI exposure period independently using the Q1 HELPER data.
- For each period, check if a NEW hepatotoxicity grade increase occurred after that period's drug administration started.
- "Plausible" means the grade increase happened AFTER the ICI period started, within a reasonable timeframe (days to weeks).
- "Implausible" means the grade increase occurred BEFORE ICI was ever administered, or there is no grade increase after any ICI period.
- Decision:
  If ANY period shows a plausible temporal relationship (grade increase after period start) = YES.
  If grade increase occurred only BEFORE ICI administration or no grade increase exists = NO.
  If insufficient data = Unknown.

Q2 (Alternative causes): Can underlying disease or concomitant medications sufficiently explain the adverse event?
- Focus on the hepatotoxicity EVENT: the first time grade reaches >= 3 (severe). If no grade >= 3 exists, use the first grade increase above 0.
- IMPORTANT FOR Q2: Consider ALL ICI exposure periods. Do NOT only look at Period 1.
- Use the Q2 HELPER data which provides pre-computed distances. USE these values directly — do NOT recalculate.
- The Q2 HELPER shows whether the event occurred DURING drug administration or AFTER it, with pre-computed distances.
- Decision (use Q2 HELPER directly):
  If BOTH ICI and a toxic drug were being administered when the event occurred (both distance = 0) = YES (alternative cause equally plausible).
  If a toxic drug's distance to event is SMALLER than or SIMILAR to the ICI drug's distance = YES (alternative cause plausible).
  If the ICI drug's distance to event is SIGNIFICANTLY smaller than ALL toxic drugs = NO (ICI is clearly the closest cause).
  If no toxic drugs exist = NO.
  If timing data is insufficient to compare = Unknown.
- NOTE: "Similar" means within approximately 7 days. "Significantly smaller" means at least 14 days difference.

Q3 (Dechallenge - improvement on discontinuation): Was there improvement when ICI was discontinued?
- Use the Q3 HELPER data which defines the exact evaluation windows and pre-computed results.
- For EACH ICI exposure period, there is a specific "dechallenge evaluation window":
  Window = (period END + 4 days) to (next period START - 1 day), or to end of data if no next period.
  Grades BEFORE this window (on stop day or within 3 days after) are EXCLUDED — drug still active.
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

Q4 (Rechallenge): Did the adverse event recur upon re-administration?
- NOTE: Q4 has its OWN rules independent from Q2 and Q3. Do NOT apply Q2's temporal proximity logic or Q3's dechallenge window logic here.
- If NOT re-administered (single exposure period only) = Unknown.
- If re-administered (multiple exposure periods), use the Q4 HELPER data and follow these steps:
  Step 1: Identify each rechallenge period's END date (the last day of drug administration). Use the "Rechallenge period end day" from Q4 HELPER.
  Step 2: Find grade increases that occurred AFTER the rechallenge period END date.
  Step 3: Calculate "days after rechallenge END" = grade increase day - rechallenge period END day. Use the pre-computed value from Q4 HELPER.
  Step 4: Determine reliability based on gap from rechallenge END date (NOT start date):
    - If days after rechallenge END <= 3 = UNRELIABLE (drug still active, grade may reflect ongoing exposure) = Unknown.
    - If days after rechallenge END >= 4 (clear gap after drug was stopped) = RELIABLE = YES.
    - If re-administered but no grade increase occurred after rechallenge end = NO.
- CRITICAL: Always measure the gap from the rechallenge period END date, NOT the start date. The end date is when the drug was last administered in that period.

=== OUTPUT FORMAT (Chain-of-Thought) ===
IMPORTANT: Write reasoning FIRST, then derive the answer from your reasoning.
PROFESSIONAL TONE: In your reasoning, only mention drugs with complete and reliable timing information. Do NOT mention drugs with unknown or missing timing data. Focus only on the evidence you can verify.
Output ONLY valid JSON:
{
  "answers": [
    {"question": 1, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No", "confidence": "High/Medium/Low"},
    {"question": 2, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 3, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 4, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"}
  ]
}`;

/**
 * Create a prompt for WHO-UMC assessment
 */
function createWhoUmcPrompt(patientData) {
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

    // Format ICI drug exposure
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
                ? ` *** RECHALLENGE: Drug was STOPPED after Period 1, then RE-ADMINISTERED in Period 2 ***`
                : '';
            return `- ${drug}:${rechallengeNote}\n${periodsStr}`;
        }
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        return `- ${drug}: exposure period unknown`;
    }).join('\n') || '- No ICI drugs found';

    const rechallengeSummary = hasRechallenge
        ? `\n\n*** RECHALLENGE OCCURRED: The ICI drug was stopped and then re-administered. ***`
        : `\n\n*** NO RECHALLENGE: The ICI drug was given continuously without being stopped and restarted. ***`;

    // Format grade timeline
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
    const toxicDrugsStr = toxicDrugs.length > 0 ? toxicDrugsWithTimeline : 'None';

    // Q1 HELPER: Pre-compute time intervals for each ICI exposure period
    let q1Helper = '';
    const sortedGradesForQ1 = [...sanitizedData.gradeChanges].sort((a, b) => a.day - b.day);
    sanitizedData.iciDrugs.forEach(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            q1Helper += `\nQ1 HELPER (pre-computed — use these for Q1):`;
            for (let i = 0; i < periods.length; i++) {
                const period = periods[i];
                q1Helper += `\n- ${drug} Period ${i + 1} (Day ${period.start} to Day ${period.end}):`;

                // Find first grade increase (grade > 0) after this period started
                const gradesAfterPeriodStart = sortedGradesForQ1.filter(g => g.day >= period.start && g.grade > 0);
                if (gradesAfterPeriodStart.length > 0) {
                    const firstGrade = gradesAfterPeriodStart[0];
                    const daysFromStart = firstGrade.day - period.start;
                    const weeksFromStart = (daysFromStart / 7).toFixed(1);
                    q1Helper += `\n  First grade increase after period start: Day ${firstGrade.day} (Grade ${firstGrade.grade})`;
                    q1Helper += `\n  Time from period start: ${daysFromStart} days (≈${weeksFromStart} weeks) → PLAUSIBLE`;
                } else {
                    q1Helper += `\n  No grade increase found after this period started`;
                }
            }

            // Check if any grade increase occurred BEFORE first ICI period
            const firstPeriodStart = periods[0].start;
            const gradesBeforeICI = sortedGradesForQ1.filter(g => g.day < firstPeriodStart && g.grade > 0);
            if (gradesBeforeICI.length > 0) {
                q1Helper += `\n- WARNING: Grade increase(s) found BEFORE first ICI administration: ${gradesBeforeICI.map(g => `Day ${g.day} Grade ${g.grade}`).join(', ')}`;
            }
        }
    });

    // Q2 HELPER: Pre-compute most recent ICI dose and event day
    // Find event day (first grade >= 3, or first grade > 0)
    let eventDay = null;
    const sortedGrades = [...sanitizedData.gradeChanges].sort((a, b) => a.day - b.day);
    const severeGrade = sortedGrades.find(g => g.grade >= 3);
    if (severeGrade) {
        eventDay = severeGrade.day;
    } else {
        const firstIncrease = sortedGrades.find(g => g.grade > 0);
        if (firstIncrease) eventDay = firstIncrease.day;
    }

    // Q2 HELPER: Pre-compute temporal proximity for alternative causes
    // Helper function: check if event occurred during drug administration
    function getDrugEventRelation(drug, evDay, useExposurePeriods) {
        const periods = useExposurePeriods ? sanitizedData.toxicExposurePeriods[drug] : sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            // Check if event occurred DURING any administration period
            for (const p of periods) {
                if (p.start <= evDay && p.end >= evDay) {
                    return { distance: 0, duringAdmin: true, period: p };
                }
            }
            // Event occurred after administration — find closest period that ended before event
            let closestEnd = null;
            for (const p of periods) {
                if (p.end < evDay) {
                    if (closestEnd === null || p.end > closestEnd.end) {
                        closestEnd = p;
                    }
                }
            }
            if (closestEnd) {
                return { distance: evDay - closestEnd.end, duringAdmin: false, period: closestEnd };
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

    // Find ICI drug relation to event
    let iciRelation = null;
    let iciDrugName = null;
    sanitizedData.iciDrugs.forEach(drug => {
        const rel = getDrugEventRelation(drug, eventDay, false);
        if (rel && (iciRelation === null || rel.distance < iciRelation.distance)) {
            iciRelation = rel;
            iciDrugName = drug;
        }
    });

    // Build Q2 helper string
    let q2Helper = '';
    if (eventDay !== null && iciRelation !== null) {
        q2Helper = `\nQ2 HELPER (pre-computed — use these directly, do NOT recalculate):
- Event day (first grade >= 3): Day ${eventDay}`;

        // ICI relation
        if (iciRelation.duringAdmin) {
            q2Helper += `\n- ICI (${iciDrugName}): Event occurred DURING administration (Day ${iciRelation.period.start}~${iciRelation.period.end}) → distance = 0 days`;
        } else {
            q2Helper += `\n- ICI (${iciDrugName}): Administration ended Day ${iciRelation.period.end}, event on Day ${eventDay} → distance = ${iciRelation.distance} days after last dose`;
        }

        // Toxic drug relations
        toxicDrugs.forEach(drug => {
            const rel = getDrugEventRelation(drug, eventDay, true);
            if (rel) {
                if (rel.duringAdmin) {
                    q2Helper += `\n- ${drug}: Event occurred DURING administration (Day ${rel.period.start}~${rel.period.end}) → distance = 0 days`;
                } else {
                    q2Helper += `\n- ${drug}: Administration ended Day ${rel.period.end}, event on Day ${eventDay} → distance = ${rel.distance} days after last dose`;
                }
            } else {
                q2Helper += `\n- ${drug}: not administered before event`;
            }
        });

        // Summary
        q2Helper += `\n- SUMMARY: ICI distance = ${iciRelation.distance} days`;
        const toxicDistances = [];
        toxicDrugs.forEach(drug => {
            const rel = getDrugEventRelation(drug, eventDay, true);
            if (rel) {
                toxicDistances.push(`${drug} = ${rel.distance} days`);
            }
        });
        if (toxicDistances.length > 0) {
            q2Helper += `, Toxic distances: ${toxicDistances.join(', ')}`;
        }
    }

    // Q3 HELPER: Pre-compute dechallenge evaluation windows for each period gap
    // Use allGradeData (not deduplicated) to check for measurements in windows
    const allGrades = sanitizedData.allGradeData;
    let q3Helper = '';
    sanitizedData.iciDrugs.forEach(drug => {
        const periods = sanitizedData.iciExposurePeriods[drug];
        if (periods && periods.length > 0) {
            q3Helper += `\nQ3 HELPER (pre-computed — use these windows for Q3):`;
            for (let i = 0; i < periods.length; i++) {
                const period = periods[i];
                const windowStart = period.end + 4; // skip 3 days after end
                const windowEnd = (i + 1 < periods.length) ? periods[i + 1].start - 1 : sanitizedData.totalDays;
                const windowLabel = `Period ${i + 1} dechallenge window`;

                if (windowStart > windowEnd) {
                    q3Helper += `\n- ${drug} ${windowLabel}: NO WINDOW — UNEVALUABLE (Period ${i + 1} end Day ${period.end} → Period ${i + 2} start Day ${periods[i + 1]?.start || 'N/A'}, gap too small)`;
                    continue;
                }

                q3Helper += `\n- ${drug} ${windowLabel}: Day ${windowStart} to Day ${windowEnd} (after Period ${i + 1} end Day ${period.end}, excluding 3 days)`;

                // Use allGradeData (includes all measurements, not deduplicated) for window check
                const allGradesInWindow = allGrades.filter(g => g.day >= windowStart && g.day <= windowEnd);
                const gradeBeforeWindow = sortedGrades.filter(g => g.day <= period.end).sort((a, b) => b.day - a.day)[0];

                if (allGradesInWindow.length > 0) {
                    const gradeList = allGradesInWindow.map(g => `Day ${g.day}: Grade ${g.grade}`).join(', ');
                    q3Helper += `\n  Grades in window: ${gradeList}`;
                    const lastInWindow = allGradesInWindow[allGradesInWindow.length - 1];
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

    // Q4 HELPER: Pre-compute rechallenge end dates and grade increases after rechallenge
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

                    // Find first grade increase after this rechallenge period end
                    const gradesAfterEnd = sortedGrades.filter(g => g.day > rechallengeEnd && g.grade > 0);
                    if (gradesAfterEnd.length > 0) {
                        const firstGradeAfter = gradesAfterEnd[0];
                        const daysAfterEnd = firstGradeAfter.day - rechallengeEnd;
                        q4Helper += `\n  First grade increase after rechallenge END: Day ${firstGradeAfter.day} (Grade ${firstGradeAfter.grade})`;
                        q4Helper += `\n  Days after rechallenge END: ${daysAfterEnd} days`;
                        q4Helper += daysAfterEnd <= 3
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

    return `=== PATIENT DATA ===

ICI DRUG EXPOSURE:
${iciEvents}
${rechallengeSummary}

HEPATOTOXICITY GRADE CHANGES:
${gradeEvents}

TOXIC MEDICATIONS (potential hepatotoxic - consider for Q2 alternative causes):
${toxicDrugsStr}
(Total: ${toxicDrugs.length} toxic drugs)

TOTAL DURATION: ${sanitizedData.totalDays} days
${q1Helper}
${q2Helper}
${q3Helper}
${q4Helper}

=== TASK ===
Based ONLY on the data above, answer all 4 WHO-UMC questions using the decision rules.
Output JSON only.`;
}

/**
 * Call AI API for WHO-UMC reasoning
 */
export async function getWhoUmcReasoning(patientData) {
    const totalStartTime = performance.now();
    console.log('=== WHO-UMC AI Reasoning Start ===');

    if (OLLAMA_CONFIG.useMockAI) {
        console.log('Using Mock AI for WHO-UMC');
        return getMockNaranjoReasoning(patientData);
    }

    const prompt = createWhoUmcPrompt(patientData);
    console.log('=== WHO-UMC Full Prompt ===');
    console.log(prompt);

    const requestBody = {
        model: OLLAMA_CONFIG.model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: OLLAMA_CONFIG.maxTokens,
        top_p: 0.9
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

        const apiStartTime = performance.now();
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const apiEndTime = performance.now();
        console.log(`[WHO-UMC TIMING] LLM Inference: ${((apiEndTime - apiStartTime) / 1000).toFixed(2)}s`);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const aiResponse = result.choices?.[0]?.message?.content;

        if (!aiResponse) {
            throw new Error('Invalid response format from Ollama');
        }

        console.log('WHO-UMC AI response:', aiResponse);

        const parsedResponse = parseWhoUmcResponse(aiResponse);

        const totalEndTime = performance.now();
        console.log(`[WHO-UMC TIMING] TOTAL: ${((totalEndTime - totalStartTime) / 1000).toFixed(2)}s`);

        return {
            success: true,
            data: parsedResponse,
            rawResponse: aiResponse,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('WHO-UMC AI error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Parse WHO-UMC AI response
 */
function parseWhoUmcResponse(response) {
    try {
        let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.answers || !Array.isArray(parsed.answers)) {
            throw new Error('Invalid response structure: missing answers array');
        }

        const expectedQuestions = [1, 2, 3, 4];
        parsed.answers = parsed.answers
            .map(item => ({
                ...item,
                question: typeof item.question === 'string' ? parseInt(item.question, 10) : item.question
            }))
            .filter(item => item && expectedQuestions.includes(item.question));

        // Q5 is always Yes (ICI-induced hepatotoxicity is well-documented)
        parsed.answers.push({
            question: 5,
            reasoning: 'ICI-induced hepatotoxicity is a well-documented immune-mediated adverse reaction listed in the LiverTox database.',
            answer: 'Yes',
            confidence: 'High'
        });

        return parsed;

    } catch (error) {
        console.error('Failed to parse WHO-UMC AI response:', error);
        return {
            answers: [1, 2, 3, 4].map(qNum => ({
                question: qNum,
                answer: 'Unknown',
                reasoning: 'Failed to parse AI response',
                confidence: 'Low'
            })).concat({
                question: 5,
                reasoning: 'ICI-induced hepatotoxicity is a well-documented immune-mediated adverse reaction listed in the LiverTox database.',
                answer: 'Yes',
                confidence: 'High'
            }),
            parseError: error.message
        };
    }
}

/**
 * Re-export health check (shared with Naranjo)
 */
export { checkOllamaHealth } from './OllamaClient.js';
