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
- SAFE MEDICATIONS: Drugs not associated with hepatotoxicity.

=== WHO-UMC QUESTIONS & DECISION RULES ===

Q1 (Time interval plausibility): Is the time between ICI drug administration and hepatotoxicity onset pharmacologically plausible?
- ICI-induced hepatotoxicity typically appears 1-12 weeks after first dose. If grade increased within this window after ICI start = YES. If grade increased before ICI or far outside expected window = NO.

Q2 (Alternative causes): Can underlying disease or concomitant medications sufficiently explain the adverse event?
- Focus on the hepatotoxicity EVENT: the first time grade reaches >= 3 (severe). If no grade >= 3 exists, use the first grade increase above 0.
- IMPORTANT FOR Q2: Consider ALL ICI exposure periods. The "most recent ICI dose" means the latest end day across ALL periods (including rechallenge periods). Do NOT only look at Period 1.
- The pre-computed "Q2 HELPER" section in the patient data provides the most recent ICI dose day. USE this value directly.
- Compare temporal proximity to the event:
  Step 1: Find the event day (first grade >= 3, or first grade > 0).
  Step 2: Use the "Most recent ICI dose before event" from the Q2 HELPER data. Calculate: event day - ICI last dose day.
  Step 3: For each toxic drug, calculate: event day - toxic drug last dose day (end day).
  Step 4: Compare the two intervals.
- Decision:
  If a toxic drug's last dose is MORE RECENT than (or similarly close to) the ICI drug's last dose relative to the event = YES (alternative cause plausible).
  If the ICI drug's last dose is SIGNIFICANTLY more recent than any toxic drug = NO (alternative cause unlikely).
  If no toxic drugs exist or no timing data is available for toxic drugs = NO.
  If timing data is insufficient to compare = Unknown.
- NOTE: "Similarly close" means within approximately 7 days of each other. "Significantly more recent" means the ICI drug's last dose is at least 2 weeks closer to the event than any toxic drug.
- WARNING (Q2-specific): This question is about temporal proximity ONLY. The Q3 rule about "ignoring grades near discontinuation" does NOT apply here. For Q2, use the actual last dose days as-is.

Q3 (Dechallenge - improvement on discontinuation): Was there improvement when ICI was discontinued?
- Assess EACH ICI discontinuation independently using these steps:
  Step 1: Identify the ICI stop date (end of exposure period).
  Step 2: IGNORE grades on the exact stop day or within 1-2 days after — these still reflect ongoing drug effect and are NOT evidence of dechallenge.
  Step 3: Evaluate the grade TREND during a follow-up window (typically 7-30+ days after stop).
  Step 4: If rechallenge occurred, evaluate ONLY the window between discontinuation and rechallenge start. Do NOT include post-rechallenge grades.
  Step 5: If a second discontinuation occurred after rechallenge, assess it separately using the same steps.
- Decision:
  If grade DECREASED during the post-discontinuation follow-up window for ANY discontinuation = YES.
  If grade stayed the same or INCREASED during that window for ALL discontinuations = NO.
  If no sufficient follow-up data exists after discontinuation = Unknown.
- WARNING: Do NOT use the grade recorded on the stop day as evidence of improvement or worsening. Only use grades from the follow-up period well after discontinuation.

Q4 (Rechallenge): Did the adverse event recur upon re-administration?
- If ICI was re-administered (multiple exposure periods) AND grade increased after re-administration = YES. If re-administered but no increase = NO. If not re-administered (single exposure period) = Unknown.

Q5 (Known specific reaction): Is ICI-induced hepatotoxicity a well-known pharmacological reaction?
- ICI-induced hepatotoxicity is a well-documented immune-mediated adverse reaction listed in LiverTox database = YES.

=== OUTPUT FORMAT (Chain-of-Thought) ===
IMPORTANT: Write reasoning FIRST, then derive the answer from your reasoning.
PROFESSIONAL TONE: In your reasoning, only mention drugs with complete and reliable timing information. Do NOT mention drugs with unknown or missing timing data. Focus only on the evidence you can verify.
Output ONLY valid JSON:
{
  "answers": [
    {"question": 1, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No", "confidence": "High/Medium/Low"},
    {"question": 2, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 3, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 4, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"},
    {"question": 5, "reasoning": "[Analyze the data step by step]", "answer": "Yes/No/Unknown", "confidence": "High/Medium/Low"}
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
        safeDrugs: patientData.safeDrugs || [],
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0,
        drugTimeline: patientData.drugTimeline || {},
        iciExposurePeriods: patientData.iciExposurePeriods || {},
        gradeChanges: patientData.gradeChanges || []
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

    // Format toxic drugs
    const toxicDrugs = sanitizedData.toxicDrugs || [];
    const toxicDrugsWithTimeline = toxicDrugs.map(drug => {
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        return `- ${drug}: timing unknown`;
    }).join('\n');
    const toxicDrugsStr = toxicDrugs.length > 0 ? toxicDrugsWithTimeline : 'None';

    // Format safe drugs
    const safeDrugs = sanitizedData.safeDrugs || [];
    const safeDrugsStr = safeDrugs.length > 0 ? safeDrugs.join(', ') : 'None';

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

    // Find most recent ICI dose day across ALL periods
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

    // Build Q2 helper string
    let q2Helper = '';
    if (eventDay !== null && mostRecentIciDay !== null) {
        const iciToEvent = eventDay - mostRecentIciDay;
        q2Helper = `\nQ2 HELPER (pre-computed — use these values for Q2):
- Event day (first grade >= 3): Day ${eventDay}
- Most recent ICI dose before event: Day ${mostRecentIciDay} (${mostRecentIciDrug})
- Days from ICI last dose to event: ${iciToEvent} days`;

        // Add toxic drug distances
        toxicDrugs.forEach(drug => {
            const timeline = sanitizedData.drugTimeline[drug];
            if (timeline && timeline.endDay <= eventDay) {
                const toxicToEvent = eventDay - timeline.endDay;
                q2Helper += `\n- Days from ${drug} last dose (Day ${timeline.endDay}) to event: ${toxicToEvent} days`;
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

SAFE MEDICATIONS (non-hepatotoxic):
${safeDrugsStr}

TOTAL DURATION: ${sanitizedData.totalDays} days
${q2Helper}

=== TASK ===
Based ONLY on the data above, answer all 5 WHO-UMC questions using the decision rules.
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

        const expectedQuestions = [1, 2, 3, 4, 5];
        parsed.answers = parsed.answers
            .map(item => ({
                ...item,
                question: typeof item.question === 'string' ? parseInt(item.question, 10) : item.question
            }))
            .filter(item => item && expectedQuestions.includes(item.question));

        return parsed;

    } catch (error) {
        console.error('Failed to parse WHO-UMC AI response:', error);
        return {
            answers: [1, 2, 3, 4, 5].map(qNum => ({
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
 * Re-export health check (shared with Naranjo)
 */
export { checkOllamaHealth } from './OllamaClient.js';
