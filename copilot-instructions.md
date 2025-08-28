````markdown
# CDM Review 문헌 검색 챗봇 개발 지침서

## 프로젝트 개요
이 시스템은 약물 유발성 간손상(DILI) 연구를 위한 의료 데이터 시각화 및 분석 시스템입니다. 현재 환자 데이터 시각화, Naranjo 알고리즘 평가, 리포트 생성 기능을 포함하고 있으며, 임상 의사결정 지원을 강화하기 위한 AI 기반 문헌 검색 챗봇을 추가하고자 합니다.

## 챗봇 목적 및 목표

### 주요 목표
- **문헌 탐색**: 사용자가 입력한 약물명이나 키워드를 기반으로 관련 DILI 연구 논문 검색
- **임상 의사결정 지원**: 진단 및 치료 결정을 뒷받침하는 근거 기반 정보 제공
- **지식 통합**: 의료진이 직접 입력한 질의와 발표된 연구 결과를 연결
- **교육 자료**: 약물 기전, 사례 연구, 치료 프로토콜에 대한 통찰 제공

### 핵심 기능
1. **자유 형식 문헌 검색**: 사용자가 직접 입력한 약물명이나 키워드 기반 논문 검색
2. **기전 연구**: 특정 약물의 간독성 기전에 대한 정보 제공
3. **사례 연구 검색**: Naranjo 점수나 임상 양상 관련 사례 탐색
4. **근거 종합**: 여러 논문의 관련 연구 결과 요약
5. **인용 관리**: 적절한 인용과 전문 논문 직접 링크 제공

### 사용자 시나리오 예시
```
"amiodarone DILI 사례가 있는 논문을 알려줘"
"paracetamol 간독성 기전이 뭔가요?"
"Naranjo score 8점 이상인 사례 논문을 찾아줘"
"ALT 수치 상승과 관련된 최신 연구는?"
"간독성 약물 상호작용에 대한 리뷰 논문이 있나요?"
```

## 보안 요구사항 (중요)

### 데이터 보호 원칙
- **PHI 노출 금지**: 환자 건강정보(PHI)는 절대 로컬 시스템 외부로 유출되어서는 안됨
- **완전한 익명화**: 외부 서비스에 대한 모든 쿼리는 완전히 익명화되어야 함
- **데이터 격리**: 환자 데이터와 문헌 검색 기능은 완전히 분리되어야 함
- **사용자 입력 검증**: 민감한 정보가 포함된 쿼리 필터링
- **감사 추적**: 보안 준수를 위해 모든 상호작용이 로깅되어야 함

### 보안 구현 조치

#### 1. 쿼리 정화 레이어
````javascript
// 필수: 외부 API 호출 전 구현
function sanitizeQuery(userInput) {
    // 환자 식별자 제거
    userInput = userInput.replace(/patient\s+\d+/gi, 'patient');
    userInput = userInput.replace(/환자\s+\d+/gi, '환자');
    
    // 구체적인 수치 일반화
    userInput = userInput.replace(/\d+\.\d+/g, '[수치]');
    
    // 병원/기관명 제거
    userInput = userInput.replace(/hospital|clinic|medical center|병원|의원|센터/gi, 'medical facility');
    
    // 개인정보가 포함될 수 있는 패턴 제거
    userInput = userInput.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');
    
    return userInput;
}

// 민감한 정보 감지
function containsSensitiveInfo(query) {
    const sensitivePatterns = [
        /주민번호|social security|ssn/gi,
        /전화번호|phone number|tel/gi,
        /이름.*님|name.*mr|name.*ms/gi,
        /생년월일|date of birth|dob/gi
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(query));
}
````

#### 2. 프록시 서버 아키텍처
- **외부 API 접근**: 모든 문헌 검색은 내부 프록시 서버를 통해야 함
- **요청 필터링**: 프록시는 모든 외부 요청을 검증하고 정화해야 함
- **응답 캐싱**: 외부 API 호출을 최소화하기 위한 응답 캐싱
- **로그 모니터링**: 보안 감사를 위한 모든 외부 요청 추적

#### 3. 로컬 처리 우선
- **온프레미스 LLM**: 가능한 경우 텍스트 처리에 로컬 언어 모델 사용
- **오프라인 기능**: 핵심 기능은 인터넷 접속 없이도 작동해야 함
- **데이터 거주**: 모든 민감한 처리는 로컬 인프라에서 수행되어야 함

## 기술 구현 지침

### 아키텍처 요구사항
```
[Svelte 프론트엔드] → [입력 검증 레이어] → [정화 레이어] → [로컬 API 게이트웨이] → [외부 문헌 API]
                                                           ↓
                                                  [로컬 LLM 서비스]
                                                           ↓
                                                  [응답 처리기]
```

### 기존 시스템과의 통합

#### 프론트엔드 통합
- 기존 Survey 컴포넌트 아래에 챗봇 섹션 추가
- 현재 3패널 레이아웃 유지: 환자 목록 | 차트 영역 | 설문 + 챗봇
- 챗봇 UI가 기존 디자인 시스템을 따르도록 보장
- 독립적인 사용자 입력 필드와 대화 인터페이스

#### 데이터 흐름
1. **사용자 입력**: 자유 형식 텍스트 입력 (약물명, 키워드, 질문)
2. **입력 검증**: 민감한 정보 포함 여부 사전 확인
3. **쿼리 정화**: 사용자 입력을 익명화하여 안전한 검색어로 변환
4. **외부 검색**: 정화된 쿼리를 문헌 데이터베이스(PubMed, Semantic Scholar)에 전송
5. **로컬 처리**: 요약 및 통찰 생성에 온프레미스 LLM 사용
6. **응답 전달**: 적절한 인용과 신뢰도 지표와 함께 결과 제시

### 권장 기술 스택

#### 핵심 컴포넌트
- **프론트엔드**: Svelte (기존 프레임워크)
- **로컬 LLM**: Ollama + Llama 3 또는 의료 도메인용 BioBERT
- **벡터 데이터베이스**: 로컬 논문 저장 및 검색용 ChromaDB
- **API 게이트웨이**: 내부 서비스 오케스트레이션용 FastAPI
- **문헌 API**: PubMed Entrez, Semantic Scholar (프록시를 통해서만)

#### 보안 도구
- **인증**: 기존 사용자 시스템과 통합된 JWT 토큰
- **암호화**: 모든 통신에 TLS 1.3
- **접근 제어**: 현재 시스템과 연계된 역할 기반 권한
- **감사 로깅**: 변조 방지 저장소를 가진 포괄적 로깅

## 개발 지침

### 코드 구조
```
src/
├── lib/
│   ├── chatbot/
│   │   ├── ChatBot.svelte          # 메인 챗봇 UI 컴포넌트
│   │   ├── QueryValidator.js       # 입력 검증 및 필터링
│   │   ├── QuerySanitizer.js       # 중요: 쿼리 익명화
│   │   ├── LiteratureSearch.js     # 외부 API 통합
│   │   └── ResponseProcessor.js    # 로컬 LLM 통합
│   └── 기존 컴포넌트들...
├── routes/
│   └── result/
│       └── +page.svelte           # 챗봇 포함하도록 수정
└── api/
    ├── literature/
    │   ├── search.js              # 문헌 검색 엔드포인트
    │   ├── summarize.js           # 로컬 LLM 처리
    │   ├── validate.js            # 입력 검증
    │   └── sanitize.js            # 보안 검증
    └── 기존 API들...
```

### 보안 검증 체크리스트
- [ ] 사용자 입력에서 모든 민감한 정보 감지 및 차단
- [ ] 쿼리에서 모든 환자 식별자 제거
- [ ] 외부 API 호출이 프록시 서버를 통해 이루어짐
- [ ] 민감한 작업에 로컬 LLM 처리 사용
- [ ] 사용자 인증 통합
- [ ] 감사 로깅 구현
- [ ] 오류 메시지나 로그에 PHI 없음
- [ ] 반환되는 모든 콘텐츠에 대한 응답 정화

### 통합 지점
1. **기존 Survey 영역 확장**: Survey 컴포넌트 아래에 챗봇 섹션 추가
2. **독립적 인터페이스**: 환자 데이터와 완전히 분리된 사용자 입력
3. **응답 표시**: 논문 제목, 초록, 링크, 관련성 점수 표시
4. **리포트 통합**: 검색된 문헌을 리포트에 포함할 수 있는 옵션

## 준수 및 윤리적 고려사항

### 의료 데이터 처리
- HIPAA 준수 요구사항 준수
- 데이터 최소화 원칙 구현
- 외부 데이터 처리에 대한 정보 제공 동의 보장
- 기관 경계 내에서 데이터 주권 유지

### AI 윤리
- AI 생성 콘텐츠 명확히 표시
- 권장사항에 대한 신뢰도 점수 제공
- 항상 인간 의료진의 판단을 우선시
- 의료 맥락에서 AI 한계에 대한 면책조항 포함

## 테스트 및 검증

### 보안 테스트
- 민감한 정보 감지 알고리즘 검증
- 쿼리 정화 기능 테스트
- 데이터 유출에 대한 침투 테스트
- 프록시 서버 보안 평가
- 인증 및 권한 부여 테스트

### 기능 테스트
- 다양한 사용자 입력에 대한 검색 정확도
- 응답 관련성 점수 평가
- 기존 워크플로우와의 통합
- 다국어 지원 (한국어/영어)
- 부하 상황에서의 성능

## UI 구현 예시

### Survey 영역 확장
````svelte
<!-- +page.svelte의 survey 영역 수정 -->
<div class="survey">
    <!-- 기존 Survey 컴포넌트 -->
    <Survey bind:this={surveyRef} {selectedPatient} {patientData} />
    
    <!-- 새로운 ChatBot 컴포넌트 추가 -->
    <div class="chatbot-section">
        <h4>📚 문헌 검색</h4>
        <ChatBot />
    </div>
</div>
````

### 챗봇 컴포넌트 구조
````svelte
<!-- ChatBot.svelte -->
<script>
    let userQuery = '';
    let messages = [];
    let isLoading = false;
    
    async function searchLiterature() {
        if (!userQuery.trim()) return;
        
        // 민감한 정보 포함 여부 확인
        if (containsSensitiveInfo(userQuery)) {
            alert('입력에 민감한 정보가 포함되어 있습니다. 일반적인 의학 용어만 사용해주세요.');
            return;
        }
        
        isLoading = true;
        
        try {
            const response = await fetch('/api/literature/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userQuery })
            });
            
            const result = await response.json();
            
            messages = [...messages, 
                { type: 'user', content: userQuery },
                { type: 'bot', content: result.summary, papers: result.papers }
            ];
            
            userQuery = '';
        } catch (error) {
            console.error('검색 실패:', error);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="chatbot-container">
    <div class="chat-messages">
        {#each messages as message}
            <div class="message {message.type}">
                <div class="message-content">{message.content}</div>
                {#if message.papers}
                    <div class="papers-list">
                        {#each message.papers as paper}
                            <div class="paper-item">
                                <a href={paper.url} target="_blank">{paper.title}</a>
                                <p class="paper-abstract">{paper.abstract}</p>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
    
    <div class="chat-input">
        <input 
            bind:value={userQuery}
            placeholder="약물명이나 관련 키워드를 입력하세요..."
            on:keydown={(e) => e.key === 'Enter' && searchLiterature()}
            disabled={isLoading}
        />
        <button on:click={searchLiterature} disabled={isLoading || !userQuery.trim()}>
            {isLoading ? '검색 중...' : '🔍'}
        </button>
    </div>
</div>

<style>
    .chatbot-container {
        border-top: 1px solid #dcdcdc;
        margin-top: 16px;
        padding-top: 16px;
        height: 300px;
        display: flex;
        flex-direction: column;
    }
    
    .chat-messages {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 12px;
        padding: 8px;
        border: 1px solid #eee;
        border-radius: 4px;
    }
    
    .message {
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 4px;
    }
    
    .message.user {
        background-color: #e3f2fd;
        margin-left: 20%;
    }
    
    .message.bot {
        background-color: #f5f5f5;
        margin-right: 20%;
    }
    
    .chat-input {
        display: flex;
        gap: 8px;
    }
    
    .chat-input input {
        flex: 1;
        padding: 8px;
        border: 1px solid #dcdcdc;
        border-radius: 4px;
    }
    
    .chat-input button {
        padding: 8px 12px;
        background-color: #216BC4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .papers-list {
        margin-top: 8px;
        padding: 8px;
        background-color: white;
        border-radius: 4px;
    }
    
    .paper-item {
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
    }
    
    .paper-abstract {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
    }
</style>
````

**중요**: 보안이 최우선입니다. 사용자가 직접 입력하는 방식이므로 더욱 엄격한 입력 검증과 정화가 필요합니다. 환자 데이터 노출 위험이 있는 모든 입력은 사전에 차단되어야 합니다.
