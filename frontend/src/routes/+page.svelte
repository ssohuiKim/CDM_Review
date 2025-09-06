<script>
  import { goto } from '$app/navigation';
  import { parsedData, groupedPatientData } from '$lib/duckdb';
  import { initializeDuckDB } from '$lib/duckdb';
  import Spinner from '$lib/components/Spinner.svelte';
  import { writable } from 'svelte/store';

  let files_1;
  let hint_1 = "";
  let state_1 = void 0;
  const loading = writable(false); // 로딩 상태를 관리하는 변수

  // Custom FileUpload component
  let fileInput;

  $: console.log(files_1);

  $: if (files_1 && files_1[0]) {
    const fileExtension = files_1[0].name.split('.').pop().toLowerCase();
    if (fileExtension !== 'txt') {
      hint_1 = "파일 형식은 txt여야 합니다";
      state_1 = "invalid";
    } else {
      hint_1 = "";
      state_1 = void 0;
    }
  }

  function handleFileSelect(event) {
    files_1 = event.target.files;
  }

  function triggerFileSelect() {
    fileInput.click();
  }

  // 프록시 객체를 일반 객체로 변환하는 함수
  function convertRowToObject(row) {
    const result = {};
    for (const key of Object.keys(row)) {
      if (row[key] instanceof Date) {
        result[key] = row[key].toISOString(); // 날짜를 ISO 문자열로 변환
      } else if (typeof row[key] === 'bigint') {
        result[key] = row[key].toString(); // BigInt를 문자열로 변환
      } else {
        result[key] = row[key];
      }
    }
    return result;
  }

  async function handleClick() {
    if (files_1 && files_1[0]) {
      loading.set(true); // 로딩 시작
      const db = await initializeDuckDB();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const tsvData = event.target.result;

        // TSV 데이터를 DuckDB에 등록하고 파싱
        await db.registerFileText('data.txt', tsvData);
        const connection = await db.connect();
        await connection.query(`
          CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.txt', delim='\t');
        `);

        // 파싱된 데이터 가져오기
        const result = await connection.query(`SELECT * FROM patients`);
        const parsedResult = result.toArray().map(convertRowToObject);
        parsedData.set(parsedResult);

        // Patient_no 기준으로 데이터 그룹화
        const groupedData = parsedResult.reduce((acc, row) => {
          const patientNo = row.patient_no;
          if (!acc[patientNo]) {
            acc[patientNo] = [];
          }
          acc[patientNo].push(row);
          return acc;
        }, {});

        // 그룹화된 데이터 스토어에 업데이트
        groupedPatientData.set(groupedData);
        loading.set(false); // 로딩 종료
        goto('/result');
      };
      reader.readAsText(files_1[0]);
    }
  }
</script>

{#if $loading}
  <Spinner/>
{:else}
  <div class="container">
    <div class="main-content">
      <h1 class="title">환자 데이터 파일 업로드</h1>
      <p class="subtitle">아래 환자의 간독성 약물 데이터가 포함된 txt 파일을 업로드해주세요</p>
      
      <div class="upload-section">
        <div class="upload-area" 
             class:dragover={false} 
             class:error={state_1 === 'invalid'} 
             class:success={files_1 && files_1[0] && state_1 !== 'invalid'}
             role="button"
             tabindex="0"
             on:click={triggerFileSelect}
             on:keydown={(e) => e.key === 'Enter' && triggerFileSelect()}>
          
          {#if files_1 && files_1[0] && state_1 !== 'invalid'}
            <!-- 파일이 선택된 상태 -->
            <div class="upload-icon success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div class="upload-text">
              <p class="upload-title success">파일이 선택되었습니다</p>
              <p class="file-info-text">{files_1[0].name} ({(files_1[0].size / 1024).toFixed(1)} KB)</p>
            </div>
            <button class="select-button success" type="button">다른 파일 선택</button>
          {:else}
            <!-- 파일이 선택되지 않은 상태 -->
            <div class="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div class="upload-text">
              <p class="upload-title">파일을 드래그하여 업로드하거나</p>
              <p class="upload-subtitle">아래 환자 데이터가 포함된 .txt 파일을 선택해주세요</p>
            </div>
            <button class="select-button" type="button">파일 선택</button>
          {/if}
          
          <input type="file" bind:this={fileInput} on:change={handleFileSelect} accept=".txt" style="display: none;" />
        </div>
        
        {#if hint_1}
          <p class="error-message">{hint_1}</p>
        {/if}
        
        <div class="file-info">
          <h3>파일 형식 안내</h3>
          <ul>
            <li>• 파일 형식: .txt (텍스트 파일)</li>
            <li>• 각 환자 정보는 한 줄씩 구분</li>
            <li>• 환자ID, 약물명, 용량, 복용기간 등 포함</li>
            <li>• UTF-8 인코딩 권장</li>
          </ul>
        </div>
        
        <button class="analyze-button" on:click={handleClick} disabled={!files_1 || files_1.length === 0 || state_1 === 'invalid'}>
          분석 시작
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding-bottom: 2rem; /* 푸터와의 여백 확보 */
  }

  .main-content {
    text-align: center;
    position: relative;
    z-index: 1; /* 상단바보다 낮은 z-index 설정 */
  }

  .title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 1rem;
  }

  .subtitle {
    font-size: 1.125rem;
    color: #718096;
    margin-bottom: 3rem;
    line-height: 1.6;
  }

  .upload-section {
    background: #f8fafc;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    position: relative;
    z-index: 1; /* 상단바보다 낮은 z-index */
  }

  .upload-area {
    position: relative;
    border: 2px dashed #cbd5e0;
    border-radius: 8px;
    padding: 3rem 2rem;
    background: white;
    transition: all 0.3s ease;
    cursor: pointer;
    z-index: 1; /* 상단바보다 낮은 z-index */
  }

  .upload-area:hover {
    border-color: #4299e1;
    background: #ebf8ff;
  }

  .upload-area.error {
    border-color: #e53e3e;
    background: #fed7d7;
  }

  .upload-area.success {
    border-color: #48bb78;
    background: #c6f6d5;
    border-style: solid;
  }

  .upload-icon {
    color: #a0aec0;
    margin-bottom: 1rem;
  }

  .upload-icon.success {
    color: #48bb78;
  }

  .upload-text {
    margin-bottom: 1.5rem;
  }

  .upload-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 0.5rem;
  }

  .upload-title.success {
    color: #2f855a;
  }

  .upload-subtitle {
    color: #718096;
    font-size: 0.875rem;
  }

  .file-info-text {
    color: #2f855a;
    font-size: 1rem;
    font-weight: 500;
  }

  .select-button {
    background: #4299e1;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .select-button:hover {
    background: #3182ce;
  }

  .select-button.success {
    background: #48bb78;
    border: 2px solid #2f855a;
  }

  .select-button.success:hover {
    background: #38a169;
  }

  .error-message {
    color: #e53e3e;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: left;
  }

  .file-info {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    text-align: left;
    border: 1px solid #e2e8f0;
  }

  .file-info h3 {
    color: #2d3748;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .file-info ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .file-info li {
    color: #718096;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .analyze-button {
    background: #48bb78;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    max-width: 300px;
    margin-bottom: 1rem; /* 적절한 여백 */
  }

  .analyze-button:hover:not(:disabled) {
    background: #38a169;
    transform: translateY(-1px);
  }

  .analyze-button:disabled {
    background: #a0aec0;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
      padding-bottom: 1.5rem;
    }
    
    .title {
      font-size: 2rem;
    }
    
    .upload-area {
      padding: 2rem 1rem;
    }
  }
</style>