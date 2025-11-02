/**
 * LocalAI Client
 * Handles communication with LocalAI API for Naranjo Algorithm reasoning
 */

import { LOCALAI_CONFIG, getApiUrl, getHealthCheckUrl } from './config.js';
import { getMockNaranjoReasoning, mockHealthCheck } from './MockAIClient.js';

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
 * Create a prompt for LocalAI to analyze patient data
 * @param {Object} patientData - Patient medical data
 * @returns {string} Formatted prompt
 */
function createNaranjoPrompt(patientData) {
    // Sanitize patient data to remove PHI (Protected Health Information)
    // Only include drug-related information, exclude age/gender
    const sanitizedData = {
        drugs: patientData.drugs || [],
        ichiDrugs: patientData.ichiDrugs || [],
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0
    };

    // Questions to ask AI (excluding fixed answers: 1, 6, 7, 9, 10)
    const aiQuestions = [
        { num: 2, text: NARANJO_QUESTIONS[1] },
        { num: 3, text: NARANJO_QUESTIONS[2] },
        { num: 4, text: NARANJO_QUESTIONS[3] },
        { num: 5, text: NARANJO_QUESTIONS[4] },
        { num: 8, text: NARANJO_QUESTIONS[7] }
    ];

    const prompt = `Analyze this drug-induced liver injury case using the Naranjo Algorithm.

Treatment Information:
- Duration: ${sanitizedData.totalDays} days
- Total medications: ${sanitizedData.drugs.length}
- Immune checkpoint inhibitors: ${sanitizedData.ichiDrugs.join(', ') || 'None'}
- Hepatotoxicity grades observed: ${sanitizedData.grades.join(', ') || 'None'}
- All drugs: ${sanitizedData.drugs.slice(0, 10).join(', ')}${sanitizedData.drugs.length > 10 ? '...' : ''}

Answer these 5 Naranjo questions:
${aiQuestions.map(q => `${q.num}. ${q.text}`).join('\n')}

Provide your assessment as JSON with ONLY these 5 questions:
{
  "answers": [
    {"question": 2, "answer": "Yes", "reasoning": "Brief clinical reasoning", "confidence": "Medium"},
    {"question": 3, "answer": "Unknown", "reasoning": "Brief clinical reasoning", "confidence": "Low"},
    {"question": 4, "answer": "Unknown", "reasoning": "Brief clinical reasoning", "confidence": "Low"},
    {"question": 5, "answer": "Unknown", "reasoning": "Brief clinical reasoning", "confidence": "Low"},
    {"question": 8, "answer": "Unknown", "reasoning": "Brief clinical reasoning", "confidence": "Low"}
  ],
  "overallAssessment": "Brief summary"
}`;

    return prompt;
}

/**
 * Call LocalAI API for Naranjo reasoning
 * @param {Object} patientData - Patient medical data
 * @returns {Promise<Object>} AI reasoning result
 */
export async function getNaranjoReasoning(patientData) {
    // Use mock AI if enabled
    if (LOCALAI_CONFIG.useMockAI) {
        console.log('Using Mock AI (LocalAI is disabled)');
        return getMockNaranjoReasoning(patientData);
    }

    console.log('Patient data sent to AI:', patientData);
    const prompt = createNaranjoPrompt(patientData);
    console.log('Generated prompt:', prompt.substring(0, 500) + '...');

    const requestBody = {
        model: LOCALAI_CONFIG.model,
        messages: [
            {
                role: 'system',
                content: 'You are a clinical pharmacology expert analyzing adverse drug reactions. Answer ONLY the 5 questions provided. Respond with valid JSON only containing those 5 questions. No explanations, no markdown, just raw JSON.'
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

        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`LocalAI API error: ${response.status} ${response.statusText}`);
        }

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

        // Merge AI answers with fixed answers
        const mergedResponse = mergeWithFixedAnswers(parsedResponse);

        return {
            success: true,
            data: mergedResponse,
            rawResponse: aiResponse,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('LocalAI API error:', error);

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Merge AI answers with fixed answers
 * @param {Object} aiResponse - Parsed AI response (questions 2, 3, 4, 5, 8)
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
 * @returns {Object} Parsed response (5 AI answers)
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

        // Validate we have the expected AI questions (2, 3, 4, 5, 8)
        const expectedQuestions = [2, 3, 4, 5, 8];
        parsed.answers = parsed.answers.filter(item =>
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
            answers: [2, 3, 4, 5, 8].map(qNum => ({
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
