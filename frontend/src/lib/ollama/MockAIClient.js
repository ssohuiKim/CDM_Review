/**
 * Mock AI Client for Testing
 * Simulates AI responses without requiring LocalAI
 */

import { NARANJO_QUESTIONS } from './OllamaClient.js';

/**
 * Generate a mock AI response for testing
 * @param {Object} patientData - Patient data
 * @returns {Promise<Object>} Mock AI response
 */
export async function getMockNaranjoReasoning(patientData) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock answers based on patient data
    const mockAnswers = NARANJO_QUESTIONS.map((question, index) => {
        const questionNum = index + 1;

        // Generate somewhat realistic answers based on question type
        let answer, reasoning, confidence;

        switch (questionNum) {
            case 1: // Previous reports
                answer = 'Yes';
                reasoning = 'Previous literature reports similar hepatotoxicity with immune checkpoint inhibitors.';
                confidence = 'High';
                break;

            case 2: // Adverse event after drug
                answer = 'Yes';
                reasoning = 'Patient developed hepatotoxicity after starting ICI therapy, temporal relationship is clear.';
                confidence = 'High';
                break;

            case 3: // Improvement after discontinuation
                answer = patientData.grades?.length > 1 ? 'Yes' : 'Unknown';
                reasoning = patientData.grades?.length > 1
                    ? 'Grade levels show improvement pattern after treatment modification.'
                    : 'Insufficient data to assess improvement after discontinuation.';
                confidence = 'Medium';
                break;

            case 4: // Recurrence on re-administration
                answer = 'No';
                reasoning = 'No evidence of drug re-challenge in the available data.';
                confidence = 'Medium';
                break;

            case 5: // Alternative causes
                answer = 'No';
                reasoning = 'Patient on immune checkpoint inhibitors which are known hepatotoxins. No clear alternative cause identified.';
                confidence = 'Medium';
                break;

            case 6: // Placebo response
                answer = 'Unknown';
                reasoning = 'No placebo control data available in this clinical context.';
                confidence = 'Low';
                break;

            case 7: // Drug detected in toxic concentrations
                answer = 'Unknown';
                reasoning = 'No toxicology data available for drug concentration levels.';
                confidence = 'Low';
                break;

            case 8: // Dose-response relationship
                answer = 'Unknown';
                reasoning = 'Insufficient data on dose modifications and corresponding response.';
                confidence = 'Low';
                break;

            case 9: // Similar reaction previously
                answer = 'Unknown';
                reasoning = 'No prior exposure history documented in the provided data.';
                confidence = 'Low';
                break;

            case 10: // Objective evidence
                answer = 'Yes';
                reasoning = 'Hepatotoxicity is confirmed by elevated ALT/AST ratios and grading system.';
                confidence = 'High';
                break;

            default:
                answer = 'Unknown';
                reasoning = 'Insufficient data to make assessment.';
                confidence = 'Low';
        }

        return {
            question: questionNum,
            answer,
            reasoning,
            confidence
        };
    });

    return {
        success: true,
        data: {
            answers: mockAnswers,
            overallAssessment: `This case shows ${patientData.iciDrugs?.length || 0} immune checkpoint inhibitor(s) with documented hepatotoxicity (Grade ${Math.max(...(patientData.grades || [0]))}). The temporal relationship between drug exposure and adverse event is established. Based on the Naranjo Algorithm assessment, this appears to be a probable adverse drug reaction requiring clinical attention and possible treatment modification.`
        },
        rawResponse: 'Mock AI Response',
        timestamp: new Date().toISOString()
    };
}

/**
 * Mock health check
 */
export async function mockHealthCheck() {
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
}
