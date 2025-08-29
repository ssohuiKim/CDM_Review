<script>
    import { sanitizeQuery, containsSensitiveInfo } from './QuerySanitizer.js';
    import { validateQuery } from './QueryValidator.js';
    import { PubMedClient } from './PubMedClient.js';
    
    export let isOpen = false;
    
    let userQuery = '';
    let messages = [];
    let isLoading = false;
    let chatContainer;
    
    // PubMed 클라이언트 초기화
    const pubmedClient = new PubMedClient({
        maxRps: 3 // 3 requests per second rate limit
    });
    
    // 샘플 논문 데이터 (fallback용 최소한만 유지)
    const samplePapers = {
        'megestrol': [
            {
                title: "Megestrol acetate-induced hepatotoxicity: A case series and literature review",
                abstract: "Megestrol acetate, a synthetic progestational agent, has been associated with rare cases of hepatotoxicity. We report three cases of liver injury associated with megestrol acetate therapy and review the literature on this uncommon but potentially serious adverse effect.",
                url: "https://pubmed.ncbi.nlm.nih.gov/32157891",
                authors: "Park JH, Kim SY, Lee MJ",
                journal: "Journal of Clinical Gastroenterology",
                year: "2020"
            }
        ]
    };
    
    async function searchLiterature() {
        if (!userQuery.trim()) return;
        
        // 입력 검증
        const validation = validateQuery(userQuery);
        if (!validation.isValid) {
            addBotMessage(`❌ ${validation.error}`);
            return;
        }
        
        if (validation.warning) {
            addBotMessage(`⚠️ ${validation.warning}`);
        }
        
        // 민감한 정보 포함 여부 확인
        if (containsSensitiveInfo(userQuery)) {
            addBotMessage('🚫 입력에 민감한 정보가 포함되어 있습니다. 일반적인 의학 용어만 사용해주세요.');
            userQuery = '';
            return;
        }
        
        // 사용자 메시지 추가
        addUserMessage(userQuery);
        
        isLoading = true;
        
        try {
            // 쿼리 정화
            const sanitizedQuery = sanitizeQuery(userQuery);
            console.log('Original query:', userQuery);
            console.log('Sanitized query:', sanitizedQuery);
            
            // PubMed로 직접 검색 (사용자 쿼리 그대로 사용)
            await searchPubMed(sanitizedQuery);
            
        } catch (error) {
            console.error('검색 실패:', error);
            addBotMessage('❌ 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            isLoading = false;
            userQuery = '';
        }
    }
    
    async function searchPubMed(query) {
        try {
            // 사용자 쿼리를 그대로 사용 (강제로 키워드 추가하지 않음)
            console.log('PubMed 검색 쿼리:', query);
            
            const result = await pubmedClient.searchWithDetails(query, 5);
            
            if (!result.papers || result.papers.length === 0) {
                addBotMessage('🔍 해당 키워드와 관련된 논문을 찾지 못했습니다. 다른 검색어를 시도해보세요.');
                return;
            }
            
            const summary = `📚 PubMed에서 ${result.papers.length}개의 관련 논문을 찾았습니다 (총 ${result.total}개 중):`;
            addBotMessage(summary, result.papers);
            
            // 데이터 소스 정보
            addBotMessage(`📍 데이터 소스: PubMed (NCBI E-utilities)`);
            
        } catch (error) {
            console.error('PubMed 검색 실패:', error);
            addBotMessage('❌ PubMed 검색 중 오류가 발생했습니다. 샘플 데이터를 사용합니다.');
            // Fallback to sample data
            await simulateSearch(query);
        }
    }
    
    async function simulateSearch(query) {
        // API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const lowerQuery = query.toLowerCase();
        let foundPapers = [];
        
        // megestrol 특별 처리 (샘플 데이터)
        if (lowerQuery.includes('megestrol')) {
            foundPapers = samplePapers.megestrol;
        }
        
        if (foundPapers.length === 0) {
            addBotMessage('🔍 PubMed 검색에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
            addBotMessage('💡 추천 검색어: "pembrolizumab hepatotoxicity", "amiodarone DILI", "drug-induced liver injury"');
            return;
        }
        
        const summary = `📚 샘플 데이터에서 ${foundPapers.length}개의 관련 논문을 찾았습니다:`;
        addBotMessage(summary, foundPapers);
        addBotMessage('📍 데이터 소스: 로컬 샘플 데이터 (PubMed 연결 실패)');
    }
    
    function addUserMessage(content) {
        messages = [...messages, { type: 'user', content, timestamp: new Date() }];
        scrollToBottom();
    }
    
    function addBotMessage(content, papers = null) {
        messages = [...messages, { 
            type: 'bot', 
            content, 
            papers, 
            timestamp: new Date() 
        }];
        scrollToBottom();
    }
    
    function scrollToBottom() {
        setTimeout(() => {
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
    }
    
    function handleKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            searchLiterature();
        }
    }
    
    function clearChat() {
        messages = [];
    }
    
    function handleOverlayClick(event) {
        // 챗봇 컨테이너 외부를 클릭했을 때만 닫기
        if (event.target === event.currentTarget) {
            isOpen = false;
        }
    }
</script>

{#if isOpen}
    <div class="chatbot-overlay" on:click={handleOverlayClick} on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}>
        <div class="chatbot-container" role="dialog" tabindex="-1">
            <div class="chat-header">
                <h4>📚 문헌 검색 챗봇</h4>
                <div class="header-buttons">
                    <button class="clear-btn" on:click={clearChat} title="대화 지우기">🗑️</button>
                    <button class="close-btn" on:click={() => isOpen = false}>✕</button>
                </div>
            </div>
            
            <div class="security-notice">
                🔒 보안 적용: 환자 정보는 외부 전송되지 않음 | 🌐 PubMed API 직접 연결
            </div>
            
            <div class="chat-messages" bind:this={chatContainer}>
                {#if messages.length === 0}
                    <div class="welcome-message">
                        <p>👋 안녕하세요! 의료 문헌 검색 챗봇입니다.</p>
                        <p>약물명이나 관련 키워드를 입력하면 PubMed에서 직접 논문을 검색해드립니다.</p>
                        <div class="example-queries">
                            <p><strong>예시:</strong></p>
                            <button on:click={() => userQuery = 'megestrol'}>megestrol</button>
                            <button on:click={() => userQuery = 'pembrolizumab hepatotoxicity'}>pembrolizumab hepatotoxicity</button>
                            <button on:click={() => userQuery = 'amiodarone DILI'}>amiodarone DILI</button>
                            <button on:click={() => userQuery = 'drug-induced liver injury'}>drug-induced liver injury</button>
                        </div>
                        <div class="api-info">
                            <small>🌐 실시간 PubMed API 사용 | 📚 NCBI E-utilities 검색</small>
                        </div>
                    </div>
                {/if}
                
                {#each messages as message}
                    <div class="message {message.type}">
                        <div class="message-content">
                            {message.content}
                        </div>
                        {#if message.papers}
                            <div class="papers-list">
                                {#each message.papers as paper}
                                    <div class="paper-item">
                                        <h5><a href={paper.url} target="_blank">{paper.title}</a></h5>
                                        <p class="paper-meta">{paper.authors} - {paper.journal} ({paper.year})</p>
                                        <p class="paper-abstract">{paper.abstract}</p>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                        <div class="message-time">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                {/each}
                
                {#if isLoading}
                    <div class="message bot">
                        <div class="loading-indicator">
                            <span>🔍</span> 논문을 검색하고 있습니다...
                        </div>
                    </div>
                {/if}
            </div>
            
            <div class="chat-input">
                <textarea 
                    bind:value={userQuery}
                    placeholder="약물명이나 관련 키워드를 입력하세요... (예: pembrolizumab, megestrol)"
                    on:keydown={handleKeydown}
                    disabled={isLoading}
                    rows="2"
                ></textarea>
                <button 
                    on:click={searchLiterature} 
                    disabled={isLoading || !userQuery.trim()}
                    class="search-btn"
                >
                    {isLoading ? '⏳' : '🔍'}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .chatbot-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .chatbot-container {
        width: 90%;
        max-width: 800px;
        height: 80%;
        max-height: 700px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .chat-header h4 {
        margin: 0;
        font-size: 1.1rem;
    }

    .header-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .clear-btn, .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .clear-btn:hover, .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .security-notice {
        background: #e8f5e8;
        color: #2d5a2d;
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
        border-bottom: 1px solid #ddd;
        text-align: center;
    }

    .chat-messages {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        background: #f8f9fa;
    }

    .welcome-message {
        text-align: center;
        color: #666;
        padding: 2rem;
    }

    .welcome-message p {
        margin: 0.5rem 0;
    }

    .example-queries {
        margin: 1rem 0;
    }

    .example-queries button {
        background: #e9ecef;
        border: 1px solid #ced4da;
        padding: 0.25rem 0.5rem;
        margin: 0.25rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .example-queries button:hover {
        background: #dee2e6;
    }

    .api-info {
        margin-top: 1rem;
        color: #6c757d;
    }

    .message {
        margin-bottom: 1rem;
        padding: 0.75rem;
        border-radius: 8px;
        max-width: 85%;
    }

    .message.user {
        background: #007bff;
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
    }

    .message.bot {
        background: white;
        border: 1px solid #e9ecef;
        margin-right: auto;
        border-bottom-left-radius: 4px;
    }

    .message-content {
        margin-bottom: 0.5rem;
    }

    .message-time {
        font-size: 0.7rem;
        opacity: 0.7;
        text-align: right;
    }

    .papers-list {
        margin-top: 0.75rem;
    }

    .paper-item {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .paper-item h5 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
    }

    .paper-item h5 a {
        color: #0066cc;
        text-decoration: none;
    }

    .paper-item h5 a:hover {
        text-decoration: underline;
    }

    .paper-meta {
        color: #666;
        font-size: 0.85rem;
        margin: 0.25rem 0;
    }

    .paper-abstract {
        color: #333;
        font-size: 0.9rem;
        margin: 0.5rem 0 0 0;
        line-height: 1.4;
    }

    .loading-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
    }

    .loading-indicator span {
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .chat-input {
        border-top: 1px solid #e9ecef;
        padding: 1rem;
        background: white;
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
    }

    .chat-input textarea {
        flex: 1;
        border: 1px solid #ced4da;
        border-radius: 6px;
        padding: 0.5rem;
        resize: none;
        font-family: inherit;
        font-size: 0.9rem;
    }

    .chat-input textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .search-btn {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
    }

    .search-btn:hover:not(:disabled) {
        background: #0056b3;
    }

    .search-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }

    /* 반응형 */
    @media (max-width: 768px) {
        .chatbot-container {
            width: 95%;
            height: 90%;
        }
        
        .message {
            max-width: 90%;
        }
        
        .chat-header h4 {
            font-size: 1rem;
        }
        
        .paper-item {
            padding: 0.5rem;
        }
    }
</style>
