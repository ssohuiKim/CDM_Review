// Input validation and filtering
export function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        return { isValid: false, error: 'Invalid query.' };
    }

    if (query.trim().length < 2) {
        return { isValid: false, error: 'Search term must be at least 2 characters.' };
    }

    if (query.length > 500) {
        return { isValid: false, error: 'Search term is too long. Please enter 500 characters or less.' };
    }

    // Medical term check (simple whitelist)
    const medicalTerms = /drug|medication|hepatotoxicity|liver|pembrolizumab|amiodarone|paracetamol|naranjo|dili|alt|ast/gi;

    if (!medicalTerms.test(query)) {
        return {
            isValid: true,
            warning: 'No medical terms detected. For more accurate results, please include drug names or medical terms.'
        };
    }

    return { isValid: true };
}
