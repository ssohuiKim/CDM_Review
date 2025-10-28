<script>
  import { Card, CardBody, CardFooter, El, Button, CardActions, FileUpload, Icon } from "yesvelte";
  import { goto } from '$app/navigation';
  import { clearDataFromIndexedDB, initializeDuckDB, exportDuckDBToIndexedDB, refreshStoresFromDB } from '$lib/duckdb';
  import Spinner from '$lib/components/Spinner.svelte';
  import { writable } from 'svelte/store';
  import { detectFileFormat, createDuckDBQuery } from '$lib/fileFormatDetector';
  import { onMount } from 'svelte';

  let files_1;
  let hint_1 = "";
  let state_1 = void 0;
  let formatDetectionResult = null;
  let isDragOver = false;
  let fileInputElement;
  const loading = writable(false); // 로딩 상태를 관리하는 변수

  $: console.log(files_1);

  $: if (files_1 && files_1[0]) {
    const fileExtension = files_1[0].name.split('.').pop().toLowerCase();
    const supportedFormats = ['txt', 'csv', 'tsv', 'xlsx'];
    
    if (!supportedFormats.includes(fileExtension)) {
      hint_1 = "Supported file formats: TXT, CSV, TSV, XLSX";
      state_1 = "Invalid";
      formatDetectionResult = null;
    } else {
      hint_1 = "";
      state_1 = void 0;
      // 파일이 선택되면 미리 포맷 감지 시도
      previewFileFormat();
    }
  }

  // 드래그 앤 드롭 이벤트 핸들러
  function handleDragOver(event) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    // Clear previous data when user drops a new file
    clearDataFromIndexedDB();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      files_1 = droppedFiles;
    }
  }

  function openFileDialog() {
    // Clear previous data when user selects a new file
    clearDataFromIndexedDB();
    fileInputElement?.click();
  }

  function handleFileSelect(event) {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
      files_1 = selectedFiles;
    }
  }

  // 파일 포맷 미리보기
  async function previewFileFormat() {
    if (!files_1 || !files_1[0]) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const result = detectFileFormat(content, files_1[0].name);
          formatDetectionResult = result;
          
          // 신뢰도가 낮으면 경고 표시
          if (result.confidence < 0.6) {
            hint_1 = `⚠️ File format detection confidence is low (${Math.round(result.confidence * 100)}%). Please check the file before uploading.`;
            state_1 = "Warning";
          } else {
            hint_1 = `✅ Detected as ${result.delimiterName} format (Confidence: ${Math.round(result.confidence * 100)}%)`;
            state_1 = "Valid";
          }
        } catch (error) {
          console.error('Failed to detect file format:', error);
          hint_1 = `❌ Failed to detect file format: ${error.message}`;
          state_1 = "Invalid";
          formatDetectionResult = null;
        }
      };
      reader.readAsText(files_1[0]);
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }

  async function handleClick() {
    if (files_1 && files_1[0]) {
      loading.set(true); // 로딩 시작

      try {
        // Initialize DuckDB (will restore from backup if exists)
        const { db, connection } = await initializeDuckDB();
        const reader = new FileReader();

        reader.onload = async (event) => {
          try {
            const fileContent = event.target.result;

            // 파일 포맷 감지 (이미 감지된 결과가 있으면 재사용)
            let detectionResult = formatDetectionResult;
            if (!detectionResult) {
              detectionResult = detectFileFormat(fileContent, files_1[0].name);
            }

            console.log('Detected file format:', detectionResult);

            // DuckDB에 파일 등록
            await db.registerFileText('data.txt', fileContent);

            // Drop existing patients table if exists
            try {
              await connection.query("DROP TABLE IF EXISTS patients");
              console.log('🗑️ Dropped existing patients table');
            } catch (error) {
              console.log('ℹ️ No existing table to drop');
            }

            // 감지된 구분자로 DuckDB 쿼리 생성 및 테이블 생성
            const createTableQuery = createDuckDBQuery('patients', 'data.txt', detectionResult.delimiter);
            console.log('DuckDB 쿼리:', createTableQuery);

            await connection.query(createTableQuery);

            // Export DuckDB to IndexedDB
            await exportDuckDBToIndexedDB();

            // Refresh Svelte stores from DuckDB
            await refreshStoresFromDB();

            loading.set(false); // 로딩 종료

            // Mark that this is initial data load (for result page)
            sessionStorage.setItem('cdm_review_initial_load', 'true');

            goto('/result');

          } catch (error) {
            console.error('데이터 처리 오류:', error);
            loading.set(false);
            alert(`데이터 처리 중 오류가 발생했습니다: ${error.message}`);
          }
        };

        reader.onerror = () => {
          loading.set(false);
          alert('파일을 읽는 중 오류가 발생했습니다.');
        };

        reader.readAsText(files_1[0]);

      } catch (error) {
        console.error('파일 업로드 오류:', error);
        loading.set(false);
        alert(`파일 업로드 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }
</script>

{#if $loading}
  <Spinner/>
{:else}
  <div class="main-container">
    <div class="header-section">
      <h1 class="main-title">CDM-Review</h1>
      <p class="main-description">
        CDM-Review is a web tool that visualizes data obtained from CDM on patients taking immune checkpoint inhibitors who showed Hepatotoxicity.
      </p>
      <p class="main-description">
        It would help medical professionals identify patients and make medication-related decisions.
      </p>
    </div>
    
    <div class="upload-section">
      <div class="upload-card">
        <!-- 숨겨진 파일 input -->
        <input 
          type="file" 
          bind:this={fileInputElement}
          on:change={handleFileSelect}
          accept=".xlsx,.csv,.tsv,.txt"
          style="display: none;"
        />
        
        <div class="upload-header">
          <h3 class="upload-title">Choose a file (TXT, CSV, TSV)</h3>
          <p class="upload-subtitle">
            Supported formats: Tab-separated (TSV), Comma-separated (CSV), Whitespace-separated (TXT)
          </p>
        </div>
        
        <!-- 드래그 앤 드롭 영역 -->
        <div 
          class="file-drop-area {isDragOver ? 'drag-over' : ''} {files_1 && files_1[0] ? 'has-file' : ''}"
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
          on:click={openFileDialog}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
        >
          <div class="drop-content">
            {#if files_1 && files_1[0]}
              <div class="file-selected">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                <div class="file-info">
                  <div class="file-name">{files_1[0].name}</div>
                  <div class="file-size">{Math.round(files_1[0].size / 1024)} KB</div>
                </div>
              </div>
            {:else}
              <div class="drop-placeholder">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <div class="drop-text">
                  <p class="drop-main">Drag and drop a file here or click to select one</p>
                  <p class="drop-sub">Only TXT, CSV, TSV files are supported</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="upload-button-container">
          <button 
            class="upload-button"
            on:click={handleClick} 
            disabled={!files_1 || !files_1[0] || state_1 === "invalid"}
          >
            Upload
          </button>
        </div>
        
        <!-- 상태 메시지 -->
        {#if hint_1}
          <div class="status-message {state_1}">
            {hint_1}
          </div>
        {/if}
        
        <!-- 파일 포맷 분석 결과 -->
        {#if formatDetectionResult}
          <div class="format-result">
            <strong>File format analysis result:</strong><br/>
            delimiter: {formatDetectionResult.delimiterName}<br/>
            reliability: {Math.round(formatDetectionResult.confidence * 100)}%<br/>
            <details class="preview-details">
              <summary>Preview (click to view)</summary>
              <pre class="preview-content">{formatDetectionResult.preview.join('\n')}</pre>
            </details>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .main-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: calc(100vh - 160px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .header-section {
    text-align: center;
    margin-bottom: 40px;
  }

  .main-title {
    font-size: 2.5rem;
    font-weight: 600;
    color: #2563eb;
    margin-bottom: 20px;
  }

  .main-description {
    font-size: 1.1rem;
    color: #6b7280;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto 10px;
  }

  .upload-section {
    display: flex;
    justify-content: center;
  }

  .upload-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    width: 100%;
  }

  .upload-header {
    text-align: left;
    margin-bottom: 24px;
  }

  .upload-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .upload-title::before {
    content: "📁";
    margin-right: 8px;
    font-size: 1.1em;
  }

  .upload-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .file-drop-area {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    /* padding: 48px 24px; */
    padding: 36px 120px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #fafafa;
    margin-bottom: 24px;
  }

  .file-drop-area:hover {
    border-color: #2563eb;
    background: #f8faff;
  }

  .file-drop-area.drag-over {
    border-color: #10b981;
    background: #f0fdf4;
    transform: scale(1.01);
  }

  .file-drop-area.has-file {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
    color: #6b7280;
    margin-bottom: 16px;
  }

  .file-selected .upload-icon {
    color: #10b981;
  }

  .drop-placeholder .drop-main {
    font-size: 1.1rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .drop-placeholder .drop-sub {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .file-selected {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .file-info .file-name {
    font-size: 1rem;
    font-weight: 500;
    color: #10b981;
    margin-bottom: 4px;
  }

  .file-info .file-size {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .upload-button-container {
    text-align: center;
    margin-bottom: 16px;
  }

  .upload-button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .upload-button:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .upload-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .status-message {
    font-size: 0.875rem;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 8px;
  }

  .status-message.valid {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .status-message.warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .status-message.invalid {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .format-result {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 16px;
    font-size: 0.875rem;
    margin-top: 16px;
  }

  .preview-details summary {
    cursor: pointer;
    color: #2563eb;
    font-weight: 500;
    margin-top: 8px;
  }

  .preview-content {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 12px;
    margin-top: 8px;
    font-size: 0.8rem;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    color: #353535;
  }
</style>