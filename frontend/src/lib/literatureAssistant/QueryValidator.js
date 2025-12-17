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

    return { isValid: true };
}
