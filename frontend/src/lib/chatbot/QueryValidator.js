// 입력 검증 및 필터링
export function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        return { isValid: false, error: '쿼리가 유효하지 않습니다.' };
    }
    
    if (query.trim().length < 2) {
        return { isValid: false, error: '검색어는 최소 2글자 이상이어야 합니다.' };
    }
    
    if (query.length > 500) {
        return { isValid: false, error: '검색어가 너무 깁니다. 500자 이하로 입력해주세요.' };
    }
    
    // 의학 용어 확인 (간단한 화이트리스트)
    const medicalTerms = /drug|medication|hepatotoxicity|liver|간독성|약물|pembrolizumab|amiodarone|paracetamol|naranjo|dili|alt|ast/gi;
    
    if (!medicalTerms.test(query)) {
        return { 
            isValid: true, 
            warning: '의학 용어가 포함되지 않았습니다. 정확한 검색을 위해 약물명이나 의학 용어를 포함해주세요.' 
        };
    }
    
    return { isValid: true };
}
