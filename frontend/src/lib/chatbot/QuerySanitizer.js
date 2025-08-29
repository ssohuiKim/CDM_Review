// 중요: 쿼리 익명화 및 보안 검증
export function sanitizeQuery(userInput) {
    if (!userInput || typeof userInput !== 'string') return '';
    
    let sanitized = userInput;
    
    // 환자 식별자 제거
    sanitized = sanitized.replace(/patient\s+\d+/gi, 'patient');
    sanitized = sanitized.replace(/환자\s+\d+/gi, '환자');
    
    // 구체적인 수치 일반화
    sanitized = sanitized.replace(/\d+\.\d+/g, '[수치]');
    
    // 병원/기관명 제거
    sanitized = sanitized.replace(/hospital|clinic|medical center|병원|의원|센터/gi, 'medical facility');
    
    // 개인정보가 포함될 수 있는 패턴 제거
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');
    
    // 전화번호 패턴 제거
    sanitized = sanitized.replace(/\d{3}-\d{3,4}-\d{4}/g, '[phone]');
    
    return sanitized.trim();
}

export function containsSensitiveInfo(query) {
    if (!query || typeof query !== 'string') return false;
    
    const sensitivePatterns = [
        /주민번호|social security|ssn/gi,
        /전화번호|phone number|tel/gi,
        /이름.*님|name.*mr|name.*ms/gi,
        /생년월일|date of birth|dob/gi,
        /\d{6}-\d{7}/g, // 주민번호 패턴
        /\d{3}-\d{3,4}-\d{4}/g, // 전화번호 패턴
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(query));
}
