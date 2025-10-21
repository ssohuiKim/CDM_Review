<script>
    import { sanitizeQuery, containsSensitiveInfo } from './QuerySanitizer.js';
    import { validateQuery } from './QueryValidator.js';
    import { PubMedClient } from './PubMedClient.js';
    
    export let isOpen = false;
    
    let userQuery = '';
    let messages = [];
    let isLoading = false;
    let chatContainer;
    
    // Drag-related variables
    let chatbotContainer;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let containerPosition = { x: 0, y: 0 };

    // Initialize PubMed client
    const pubmedClient = new PubMedClient({
        maxRps: 3 // 3 requests per second rate limit
    });

    // Reset position when chatbot opens
    $: if (isOpen) {
        setTimeout(resetPosition, 0);
    }

    // Sample paper data (minimal fallback only)
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

        // Validate input
        const validation = validateQuery(userQuery);
        if (!validation.isValid) {
            addBotMessage(`❌ ${validation.error}`);
            return;
        }

        if (validation.warning) {
            addBotMessage(`⚠️ ${validation.warning}`);
        }

        // Check for sensitive information
        if (containsSensitiveInfo(userQuery)) {
            addBotMessage('🚫 Your input contains sensitive information. Please use general medical terms only.');
            userQuery = '';
            return;
        }

        // Add user message
        addUserMessage(userQuery);

        isLoading = true;

        try {
            // Sanitize query
            const sanitizedQuery = sanitizeQuery(userQuery);
            console.log('Original query:', userQuery);
            console.log('Sanitized query:', sanitizedQuery);

            // Search PubMed directly (using sanitized query)
            await searchPubMed(sanitizedQuery);

        } catch (error) {
            console.error('Search failed:', error);
            addBotMessage('❌ An error occurred during search. Please try again.');
        } finally {
            isLoading = false;
            userQuery = '';
        }
    }
    
    async function searchPubMed(query) {
        try {
            // Use query as-is (do not force additional keywords)
            console.log('PubMed search query:', query);

            const result = await pubmedClient.searchWithDetails(query, 5);

            if (!result.papers || result.papers.length === 0) {
                addBotMessage('🔍 No papers found for this keyword. Please try different search terms.');
                return;
            }

            const summary = `📚 Found ${result.papers.length} related papers on PubMed (out of ${result.total} total):`;
            addBotMessage(summary, result.papers);

            // Data source information
            addBotMessage(`📍 Data source: PubMed (NCBI E-utilities)`);

        } catch (error) {
            console.error('PubMed search failed:', error);
            addBotMessage('❌ An error occurred while searching PubMed. Using sample data.');
            // Fallback to sample data
            await simulateSearch(query);
        }
    }
    
    async function simulateSearch(query) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const lowerQuery = query.toLowerCase();
        let foundPapers = [];

        // Special handling for megestrol (sample data)
        if (lowerQuery.includes('megestrol')) {
            foundPapers = samplePapers.megestrol;
        }

        if (foundPapers.length === 0) {
            addBotMessage('🔍 PubMed search failed. Please check your network connection and try again.');
            addBotMessage('💡 Suggested searches: "pembrolizumab hepatotoxicity", "amiodarone DILI", "drug-induced liver injury"');
            return;
        }

        const summary = `📚 Found ${foundPapers.length} related papers in sample data:`;
        addBotMessage(summary, foundPapers);
        addBotMessage('📍 Data source: Local sample data (PubMed connection failed)');
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
        // Close only when clicking outside the chatbot container
        if (event.target === event.currentTarget) {
            isOpen = false;
        }
    }

    // Drag functionality functions
    function handleMouseDown(event) {
        if (event.target.closest('.header-buttons')) {
            // Don't drag when clicking header buttons
            return;
        }

        isDragging = true;

        // Calculate offset considering current container position
        const rect = chatbotContainer.getBoundingClientRect();
        const overlayRect = chatbotContainer.parentElement.getBoundingClientRect();

        // Offset from mouse position to actual container position
        dragOffset.x = event.clientX - rect.left;
        dragOffset.y = event.clientY - rect.top;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        event.preventDefault();
    }
    
    function handleMouseMove(event) {
        if (!isDragging) return;

        // Calculate new position relative to overlay
        const overlayRect = chatbotContainer.parentElement.getBoundingClientRect();
        const newX = event.clientX - overlayRect.left - dragOffset.x;
        const newY = event.clientY - overlayRect.top - dragOffset.y;

        // Check screen boundaries (restrict to overlay)
        const containerWidth = chatbotContainer.offsetWidth;
        const containerHeight = chatbotContainer.offsetHeight;
        const overlayWidth = overlayRect.width;
        const overlayHeight = overlayRect.height;

        const maxX = overlayWidth - containerWidth;
        const maxY = overlayHeight - containerHeight;

        containerPosition.x = Math.max(0, Math.min(newX, maxX));
        containerPosition.y = Math.max(0, Math.min(newY, maxY));

        // Update container position (relative to overlay)
        chatbotContainer.style.position = 'absolute';
        chatbotContainer.style.left = containerPosition.x + 'px';
        chatbotContainer.style.top = containerPosition.y + 'px';
        chatbotContainer.style.transform = 'none';
        chatbotContainer.style.margin = '0';
    }

    function handleMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    // Reset position when chatbot opens
    function resetPosition() {
        if (chatbotContainer) {
            containerPosition = { x: 0, y: 0 };
            chatbotContainer.style.position = '';
            chatbotContainer.style.left = '';
            chatbotContainer.style.top = '';
            chatbotContainer.style.transform = '';
            chatbotContainer.style.margin = '';
        }
    }
</script>

{#if isOpen}
    <div class="chatbot-overlay" on:click={handleOverlayClick} on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}>
        <div 
            class="chatbot-container" 
            class:dragging={isDragging}
            role="dialog" 
            tabindex="-1"
            bind:this={chatbotContainer}
        >
            <div
                class="chat-header"
                on:mousedown={handleMouseDown}
            >
                <h4>📚 Literature Search Assistant <span class="drag-hint">📌</span></h4>
                <div class="header-buttons">
                    <button class="clear-btn" on:click={clearChat} title="Clear chat">🗑️</button>
                    <button class="close-btn" on:click={() => isOpen = false}>✕</button>
                </div>
            </div>

            <div class="security-notice">
                🔒 Security: Patient information is not transmitted externally | 🌐 Direct PubMed API connection
            </div>
            
            <div class="chat-messages" bind:this={chatContainer}>
                {#if messages.length === 0}
                    <div class="welcome-message">
                        <p>👋 Hello! I'm the medical literature search assistant.</p>
                        <p>Enter a drug name or related keywords to search for papers directly on PubMed.</p>
                        <div class="example-queries">
                            <p><strong>Examples:</strong></p>
                            <button on:click={() => userQuery = 'megestrol'}>megestrol</button>
                            <button on:click={() => userQuery = 'pembrolizumab hepatotoxicity'}>pembrolizumab hepatotoxicity</button>
                            <button on:click={() => userQuery = 'amiodarone DILI'}>amiodarone DILI</button>
                            <button on:click={() => userQuery = 'drug-induced liver injury'}>drug-induced liver injury</button>
                        </div>
                        <div class="api-info">
                            <small>🌐 Real-time PubMed API | 📚 NCBI E-utilities search</small>
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
                            <span>🔍</span> Searching for papers...
                        </div>
                    </div>
                {/if}
            </div>

            <div class="chat-input">
                <textarea
                    bind:value={userQuery}
                    placeholder="Enter drug name or related keywords... (e.g., pembrolizumab, megestrol)"
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
        position: relative;
        transition: box-shadow 0.2s ease;
    }
    
    .chatbot-container.dragging {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        z-index: 10000;
    }

    .chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
        position: relative;
    }
    
    .chat-header:hover {
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }
    
    .chat-header:active {
        cursor: grabbing;
    }

    .chat-header h4 {
        margin: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .drag-hint {
        font-size: 0.9rem;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }
    
    .chat-header:hover .drag-hint {
        opacity: 1;
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
        position: relative;
        z-index: 1;
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
