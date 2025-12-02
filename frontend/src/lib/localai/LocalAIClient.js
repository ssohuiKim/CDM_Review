/**
 * LocalAI Client
 * Handles communication with LocalAI API for Naranjo Algorithm reasoning
 */

import { LOCALAI_CONFIG, getApiUrl, getHealthCheckUrl } from './config.js';
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

Your task is to analyze medication and liver toxicity data step by step.

STEP 1: Identify ICI drugs from this list:
${ICI_DRUG_LIST.join(', ')}

STEP 2: Construct timeline:
- ICI start day (earliest day_num for ICI drug)
- ICI end day (latest day_num for ICI drug)
- Grade changes over time

STEP 3: Determine:
- Q3: Did liver injury improve AFTER ICI was stopped?
- Q4: Was ICI re-administered after stopping?
- Q5: Are there other hepatotoxic drugs that could cause this?

STEP 4: Output ONLY valid JSON (no markdown, no explanation):
{
  "answers": [
    {"question": 3, "answer": "Yes/No/Unknown", "reasoning": "...", "confidence": "High/Medium/Low"},
    {"question": 4, "answer": "Yes/No/Unknown", "reasoning": "...", "confidence": "High/Medium/Low"},
    {"question": 5, "answer": "Yes/No/Unknown", "reasoning": "...", "confidence": "High/Medium/Low"}
  ],
  "overallAssessment": "..."
}`;

/**
 * Create a prompt for LocalAI to analyze patient data
 * @param {Object} patientData - Patient medical data
 * @returns {string} Formatted prompt
 */
function createNaranjoPrompt(patientData) {
    const sanitizedData = {
        drugs: patientData.drugs || [],
        ichiDrugs: patientData.ichiDrugs || [],
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0,
        drugTimeline: patientData.drugTimeline || {},
        gradeChanges: patientData.gradeChanges || []
    };

    // Format ICI drug exposure as structured events
    const iciEvents = sanitizedData.ichiDrugs.map(drug => {
        const timeline = sanitizedData.drugTimeline[drug];
        if (timeline) {
            return `- ${drug}: Day ${timeline.startDay} to Day ${timeline.endDay}`;
        }
        return `- ${drug}: exposure period unknown`;
    }).join('\n') || '- No ICI drugs found';

    // Format grade timeline as events
    const gradeEvents = sanitizedData.gradeChanges.length > 0
        ? sanitizedData.gradeChanges.map(g => `- Day ${g.day}: Grade ${g.grade}`).join('\n')
        : '- No grade data available';

    // Format other drugs (potential alternative causes)
    const otherDrugs = sanitizedData.drugs
        .filter(d => !sanitizedData.ichiDrugs.includes(d))
        .slice(0, 10);
    const otherDrugsStr = otherDrugs.length > 0
        ? otherDrugs.join(', ')
        : 'None';

    // Build the user prompt with structured data
    const prompt = `Analyze this DILI case and answer Naranjo questions 3, 4, 5.

=== PATIENT DATA ===

ICI DRUG EXPOSURE:
${iciEvents}

HEPATOTOXICITY GRADE CHANGES:
${gradeEvents}

OTHER MEDICATIONS (potential alternative causes):
${otherDrugsStr}

TOTAL TREATMENT DURATION: ${sanitizedData.totalDays} days

=== NARANJO QUESTIONS ===

3. Did the adverse reaction improve when the drug was discontinued?
4. Did the adverse reaction appear when the drug was re-administered?
5. Are there alternative causes that could have caused the reaction?

=== INSTRUCTIONS ===

Think step by step:
1. When was ICI started and stopped?
2. Did grade decrease AFTER ICI stop day?
3. Was ICI given again after stopping?
4. Could other drugs cause hepatotoxicity?

Then output ONLY JSON with your answers.`;

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
    if (LOCALAI_CONFIG.useMockAI) {
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
        model: LOCALAI_CONFIG.model,
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
        max_tokens: LOCALAI_CONFIG.maxTokens,
        top_p: 0.9
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LOCALAI_CONFIG.timeout);

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
            throw new Error(`LocalAI API error: ${response.status} ${response.statusText}`);
        }

        // Step 3: Response Parsing
        const parseStartTime = performance.now();
        const result = await response.json();
        console.log('LocalAI raw result:', result);

        // Extract the AI's response
        const aiResponse = result.choices?.[0]?.message?.content;

        if (!aiResponse) {
            console.error('Invalid LocalAI response structure:', JSON.stringify(result, null, 2));
            throw new Error('Invalid response format from LocalAI');
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
        overallAssessment: aiResponse.overallAssessment || 'Assessment based on available data',
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
            overallAssessment: 'Error processing AI response',
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
 * Health check for LocalAI service
 * @returns {Promise<boolean>} True if service is available
 */
export async function checkLocalAIHealth() {
    // Always return true if using mock AI
    if (LOCALAI_CONFIG.useMockAI) {
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
        console.error('LocalAI health check failed:', error);
        return false;
    }
}
