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
    const sanitizedData = {
        age: patientData.age || 'unknown',
        gender: patientData.gender || 'unknown',
        drugs: patientData.drugs || [],
        ichiDrugs: patientData.ichiDrugs || [],
        grades: patientData.grades || [],
        totalDays: patientData.totalDays || 0
    };

    const prompt = `You are a medical expert analyzing Drug-Induced Liver Injury (DILI) cases for the Naranjo Algorithm assessment.

Patient Information (anonymized):
- Age: ${sanitizedData.age}
- Gender: ${sanitizedData.gender}
- Treatment Duration: ${sanitizedData.totalDays} days
- Number of Drugs: ${sanitizedData.drugs.length}
- Immune Checkpoint Inhibitors: ${sanitizedData.ichiDrugs.join(', ') || 'None'}
- Hepatotoxicity Grades Observed: ${sanitizedData.grades.join(', ') || 'None'}

Naranjo Algorithm Questions:
${NARANJO_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Based on the patient data above, please answer each of the 10 Naranjo Algorithm questions with "Yes", "No", or "Unknown".

IMPORTANT INSTRUCTIONS:
1. For each question, provide:
   - Your answer (Yes/No/Unknown)
   - A brief clinical reasoning (2-3 sentences maximum)

2. Format your response EXACTLY as JSON:
{
  "answers": [
    {
      "question": 1,
      "answer": "Yes|No|Unknown",
      "reasoning": "Brief explanation here",
      "confidence": "High|Medium|Low"
    },
    ...repeat for all 10 questions
  ],
  "overallAssessment": "Brief overall assessment of the case (2-3 sentences)"
}

3. Be conservative in your assessment. If data is insufficient, answer "Unknown".
4. Focus on clinical evidence and avoid speculation.
5. Do not include any patient-identifying information in your response.

Provide your analysis now:`;

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

    const prompt = createNaranjoPrompt(patientData);

    const requestBody = {
        model: LOCALAI_CONFIG.model,
        messages: [
            {
                role: 'system',
                content: 'You are a clinical expert in pharmacovigilance and drug-induced liver injury assessment. Provide evidence-based, conservative clinical assessments.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: LOCALAI_CONFIG.temperature,
        max_tokens: LOCALAI_CONFIG.maxTokens,
        top_p: LOCALAI_CONFIG.topP
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

        // Extract the AI's response
        const aiResponse = result.choices?.[0]?.message?.content;

        if (!aiResponse) {
            throw new Error('Invalid response format from LocalAI');
        }

        // Parse the JSON response from AI
        const parsedResponse = parseAIResponse(aiResponse);

        return {
            success: true,
            data: parsedResponse,
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
 * Parse AI response and extract structured data
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed response
 */
function parseAIResponse(response) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!parsed.answers || !Array.isArray(parsed.answers)) {
            throw new Error('Invalid response structure: missing answers array');
        }

        if (parsed.answers.length !== 10) {
            console.warn(`Expected 10 answers, got ${parsed.answers.length}`);
        }

        return parsed;

    } catch (error) {
        console.error('Failed to parse AI response:', error);

        // Return a fallback structure
        return {
            answers: NARANJO_QUESTIONS.map((q, i) => ({
                question: i + 1,
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
