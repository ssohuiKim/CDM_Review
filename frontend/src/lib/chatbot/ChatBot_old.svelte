<script>
    import { sanitizeQuery, containsSensitiveInfo } from './QuerySanitizer.js';
    import { validateQue        if (foundPapers.length === 0) {
            addBotMessage('🔍 PubMed 검색에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
            addBotMessage('💡 추천 검색어: "pembrolizumab hepatotoxicity", "amiodarone DILI", "drug-induced liver injury"');
            return;
        }
        
        const summary = `📚 샘플 데이터에서 ${foundPapers.length}개의 관련 논문을 찾았습니다:`;
        addBotMessage(summary, foundPapers);
        addBotMessage('📍 데이터 소스: 로컬 샘플 데이터 (PubMed 연결 실패)');om './QueryValidator.js';
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
            addBotMessage('🔍 EuropePMC 검색에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
            addBotMessage('� 추천 검색어: "pembrolizumab hepatotoxicity", "amiodarone DILI", "drug-induced liver injury"');
            return;
        }
        
        const summary = `📚 샘플 데이터에서 ${foundPapers.length}개의 관련 논문을 찾았습니다:`;
        addBotMessage(summary, foundPapers);
        addBotMessage('📍 데이터 소스: 로컬 샘플 데이터 (EuropePMC 연결 실패)');
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
</script>

{#if isOpen}
    <div class="chatbot-overlay" role="button" tabindex="-1" on:click={() => isOpen = false} on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}>
        <div class="chatbot-container" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown={() => {}}>
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
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .chatbot-container {
        width: 90%;
        max-width: 600px;
        height: 80%;
        background: white;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    }
    
    .chat-header {
        background: linear-gradient(135deg, #216BC4, #1976D2);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .chat-header h4 {
        margin: 0;
        font-size: 16px;
    }
    
    .header-buttons {
        display: flex;
        gap: 8px;
    }
    
    .clear-btn, .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .clear-btn:hover, .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .security-notice {
        background: #e8f5e8;
        padding: 8px 16px;
        font-size: 12px;
        color: #2e7d32;
        border-bottom: 1px solid #ddd;
    }
    
    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fa;
    }
    
    .welcome-message {
        text-align: center;
        color: #666;
        padding: 20px;
    }
    
    .example-queries {
        margin-top: 16px;
    }
    
    .example-queries button {
        background: #e3f2fd;
        border: 1px solid #216BC4;
        color: #216BC4;
        padding: 4px 8px;
        border-radius: 12px;
        margin: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .example-queries button:hover {
        background: #216BC4;
        color: white;
    }
    
    .api-info {
        margin-top: 12px;
        padding: 8px;
        background: #f0f8ff;
        border-radius: 6px;
        color: #1565c0;
        text-align: center;
    }
    
    .message {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;
        position: relative;
    }
    
    .message.user {
        background: #e3f2fd;
        margin-left: 20%;
        border-bottom-right-radius: 4px;
    }
    
    .message.bot {
        background: white;
        margin-right: 20%;
        border: 1px solid #e0e0e0;
        border-bottom-left-radius: 4px;
    }
    
    .message-content {
        margin-bottom: 8px;
    }
    
    .message-time {
        font-size: 10px;
        color: #999;
        text-align: right;
    }
    
    .papers-list {
        margin-top: 12px;
        border-top: 1px solid #eee;
        padding-top: 12px;
    }
    
    .paper-item {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 12px;
        border-left: 3px solid #216BC4;
    }
    
    .paper-item h5 {
        margin: 0 0 8px 0;
        font-size: 14px;
    }
    
    .paper-item h5 a {
        color: #216BC4;
        text-decoration: none;
    }
    
    .paper-item h5 a:hover {
        text-decoration: underline;
    }
    
    .paper-meta {
        font-size: 12px;
        color: #666;
        margin: 4px 0;
        font-style: italic;
    }
    
    .paper-abstract {
        font-size: 12px;
        color: #555;
        margin: 8px 0 0 0;
        line-height: 1.4;
    }
    
    .loading-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
    }
    
    .loading-indicator span {
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .chat-input {
        padding: 16px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 8px;
        background: white;
    }
    
    .chat-input textarea {
        flex: 1;
        padding: 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
        outline: none;
    }
    
    .chat-input textarea:focus {
        border-color: #216BC4;
        box-shadow: 0 0 0 2px rgba(33, 107, 196, 0.1);
    }
    
    .search-btn {
        padding: 12px 16px;
        background: #216BC4;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.2s;
    }
    
    .search-btn:hover:not(:disabled) {
        background: #1976D2;
    }
    
    .search-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
</style>
