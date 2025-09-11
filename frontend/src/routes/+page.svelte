<script>
  import { goto } from '$app/navigation';
  import { parsedData, groupedPatientData } from '$lib/duckdb';
  import { initializeDuckDB } from '$lib/duckdb';
  import Spinner from '$lib/components/Spinner.svelte';
  import { writable } from 'svelte/store';

  let files_1;
  let hint_1 = "";
  let state_1 = void 0;
  let isDragOver = false;
  let fileUploadStatus = "";
  const loading = writable(false); // 로딩 상태를 관리하는 변수

  // Custom FileUpload component
  let fileInput;

  $: if (files_1 && files_1[0]) {
    const fileExtension = files_1[0].name.split('.').pop().toLowerCase();
    const allowedExtensions = ['csv', 'xlsx', 'sav', 'txt'];
    
    if (!allowedExtensions.includes(fileExtension)) {
      hint_1 = "지원되는 파일 형식: CSV, XLSX, SAV, TXT (구분자 자동 감지)";
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
    
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      files_1 = droppedFiles;
    }
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
      loading.set(true);
      fileUploadStatus = ""; // 상태 메시지 초기화
      const db = await initializeDuckDB();
      const file = files_1[0];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      try {
        if (fileExtension === 'csv') {
          // CSV 파일 처리
          const reader = new FileReader();
          reader.onload = async (event) => {
            const csvData = event.target.result;
            await db.registerFileText('data.csv', csvData);
            const connection = await db.connect();
            await connection.query(`
              CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.csv', delim=',');
            `);
            await processData(connection);
          };
          reader.readAsText(file);
          
        } else if (fileExtension === 'txt') {
          // TXT 파일 처리 (자동 구분자 감지)
          const reader = new FileReader();
          reader.onload = async (event) => {
            const txtData = event.target.result;
            
            // 첫 몇 줄을 분석하여 구분자 감지 - 개선된 로직
            const lines = txtData.split('\n').filter(line => line.trim().length > 0).slice(0, 10);
            let delimiter = '\t'; // 기본값: 탭
            
            // 구분자 자동 감지 - 개선된 로직
            let detectedDelimiterName = '탭';
            if (lines.length > 1) {
              let bestDelimiter = '\t';
              let bestScore = 0;
              let bestDelimiterName = '탭';
              
              // 각 구분자의 일관성을 확인
              const delimiters = [
                { char: ',', name: '콤마' },
                { char: '\t', name: '탭' },
                { char: ' ', name: '공백' }
              ];
              
              for (const delim of delimiters) {
                const counts = [];
                let validLines = 0;
                
                // 여러 줄에서 일관성 확인 (첫 번째 줄은 헤더이므로 제외)
                for (let i = 1; i < Math.min(lines.length, 6); i++) {
                  const line = lines[i].trim();
                  if (line.length === 0) continue;
                  
                  let count;
                  if (delim.char === ' ') {
                    // 공백의 경우: 연속된 공백을 하나로 처리하고 필드 개수 계산
                    const fields = line.split(/\s+/);
                    count = fields.length > 1 ? fields.length - 1 : 0;
                  } else if (delim.char === '\t') {
                    // 탭의 경우
                    count = (line.match(/\t/g) || []).length;
                  } else if (delim.char === ',') {
                    // 콤마의 경우
                    count = (line.match(/,/g) || []).length;
                  }
                  
                  if (count > 0) {
                    counts.push(count);
                    validLines++;
                  }
                }
                
                // 일관성 점수 계산 (같은 개수의 구분자가 여러 줄에 있으면 높은 점수)
                if (counts.length > 0) {
                  const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                  const minCount = Math.min(...counts);
                  const maxCount = Math.max(...counts);
                  const consistency = maxCount > 0 ? 1 - (maxCount - minCount) / maxCount : 1;
                  const score = avgCount * consistency * validLines * validLines; // 유효한 줄 수에 가중치 부여
                  
                  if (score > bestScore && validLines > 0) {
                    bestScore = score;
                    bestDelimiter = delim.char;
                    bestDelimiterName = delim.name;
                  }
                }
              }
              
              delimiter = bestDelimiter;
              detectedDelimiterName = bestDelimiterName;
            }
            
            await db.registerFileText('data.txt', txtData);
            const connection = await db.connect();
            
            try {
              // 구분자에 따른 SQL 쿼리 실행
              if (delimiter === ' ') {
                // 공백 구분 파일의 경우 - 전처리 후 처리
                // 여러 연속 공백을 탭으로 변환하여 처리
                const processedData = txtData.split('\n').map(line => {
                  return line.trim().replace(/\s+/g, '\t');
                }).join('\n');
                
                await db.registerFileText('data_processed.txt', processedData);
                await connection.query(`
                  CREATE TABLE patients AS SELECT * FROM read_csv_auto('data_processed.txt', 
                    sep='\t',
                    header=true,
                    ignore_errors=true,
                    normalize_names=true
                  );
                `);
              } else if (delimiter === '\t') {
                // 탭 구분 파일
                await connection.query(`
                  CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.txt', 
                    sep='\t',
                    header=true,
                    ignore_errors=true,
                    normalize_names=true
                  );
                `);
              } else if (delimiter === ',') {
                // 콤마 구분 파일
                await connection.query(`
                  CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.txt', 
                    sep=',',
                    header=true,
                    ignore_errors=true,
                    normalize_names=true,
                    quote='"'
                  );
                `);
              }
              
              fileUploadStatus = `파일 업로드 완료! (감지된 구분자: ${detectedDelimiterName})`;
            } catch (error) {
              // TXT 파일 파싱 실패 시 자동 감지 모드로 재시도
              try {
                // 기본 auto 모드로 재시도
                await connection.query(`
                  CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.txt', 
                    header=true,
                    ignore_errors=true,
                    normalize_names=true
                  );
                `);
                fileUploadStatus = `파일 업로드 완료! (자동 감지 모드)`;
              } catch (autoError) {
                fileUploadStatus = `파일 업로드 실패: ${autoError.message}`;
                loading.set(false);
                return;
              }
            }
            
            await processData(connection);
          };
          reader.readAsText(file);
          
        } else if (fileExtension === 'xlsx') {
          // XLSX 파일 처리
          const arrayBuffer = await file.arrayBuffer();
          await db.registerFileBuffer('data.xlsx', new Uint8Array(arrayBuffer));
          const connection = await db.connect();
          await connection.query(`
            INSTALL spatial;
            LOAD spatial;
            CREATE TABLE patients AS SELECT * FROM st_read('data.xlsx');
          `);
          await processData(connection);
          
        } else if (fileExtension === 'sav') {
          // SAV 파일 처리 (SPSS)
          const arrayBuffer = await file.arrayBuffer();
          await db.registerFileBuffer('data.sav', new Uint8Array(arrayBuffer));
          const connection = await db.connect();
          // DuckDB의 SPSS 파일 지원이 제한적일 수 있으므로 시도해봅니다
          try {
            await connection.query(`
              CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.sav');
            `);
          } catch (error) {
            fileUploadStatus = 'SAV 파일 형식은 현재 지원되지 않습니다. CSV 또는 XLSX 파일을 사용해주세요.';
            loading.set(false);
            return;
          }
          await processData(connection);
        }
      } catch (error) {
        fileUploadStatus = `파일 처리 중 오류가 발생했습니다: ${error.message}`;
        loading.set(false);
      }
    }
  }

  // 공통 데이터 처리 함수
  async function processData(connection) {
    try {
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

      groupedPatientData.set(groupedData);
      loading.set(false);
      goto('/result');
    } catch (error) {
      fileUploadStatus = '데이터 처리 중 오류가 발생했습니다.';
      loading.set(false);
    }
  }
</script>

{#if $loading}
  <Spinner/>
{:else}
  <div class="container">
    <div class="main-content">
      <h1 class="title">Upload Patient Data File</h1>
      <p class="subtitle">Please upload a .txt file containing the patient’s hepatotoxic drug data below</p>
      
      <div class="upload-section">
        <div class="upload-area" 
             class:dragover={isDragOver} 
             class:error={state_1 === 'invalid'} 
             class:success={files_1 && files_1[0] && state_1 !== 'invalid'}
             role="button"
             tabindex="0"
             on:click={triggerFileSelect}
             on:keydown={(e) => e.key === 'Enter' && triggerFileSelect()}
             on:dragover={handleDragOver}
             on:dragleave={handleDragLeave}
             on:drop={handleDrop}>
          
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
            <button class="select-button success" type="button">Choose another file</button>
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
              <p class="upload-title">Drag & drop your file here, or</p>
              <p class="upload-subtitle">Select a CSV, XLSX, SAV, or TXT file with patient data</p>
            </div>
            <button class="select-button" type="button">Choose file</button>
          {/if}
          
          <input type="file" bind:this={fileInput} on:change={handleFileSelect} accept=".csv,.xlsx,.sav,.txt" style="display: none;" />
        </div>
        
        {#if hint_1}
          <p class="error-message">{hint_1}</p>
        {/if}
        
        {#if fileUploadStatus}
          <p class="status-message">{fileUploadStatus}</p>
        {/if}
        
        <div class="file-info">
          <h3>지원되는 파일 형식</h3>
          <ul>
            <li>• <strong>CSV</strong>: 콤마로 구분된 값 파일 (.csv)</li>
            <li>• <strong>XLSX</strong>: Excel 2007 이상 스프레드시트 (.xlsx)</li>
            <li>• <strong>SAV</strong>: SPSS 통계 파일 (.sav)</li>
            <li>• <strong>TXT</strong>: 구분자로 분리된 텍스트 파일 (.txt) - 탭, 공백, 콤마 구분 자동 감지</li>
          </ul>
          <div class="file-requirements">
            <h4>데이터 요구사항:</h4>
            <ul>
              <li>• 환자ID, 약물명, 용량, 복용기간 등 포함</li>
              <li>• 첫 번째 행은 컬럼 헤더로 구성</li>
              <li>• UTF-8 인코딩 권장</li>
              <li>• TXT 파일: 탭, 공백, 콤마 구분자 모두 지원 (자동 감지)</li>
            </ul>
            <div class="supported-formats">
              <h5>지원되는 TXT 파일 형식 예시:</h5>
              <div class="format-examples">
                <code>patient_no	drug_name	dosage</code> (탭 구분)<br>
                <code>patient_no drug_name dosage</code> (공백 구분)<br>
                <code>patient_no,drug_name,dosage</code> (콤마 구분)
              </div>
            </div>
          </div>
        </div>
        
        <button class="analyze-button" on:click={handleClick} disabled={!files_1 || files_1.length === 0 || state_1 === 'invalid'}>
          Submit
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

  .upload-area.dragover {
    border-color: #4299e1;
    background: #ebf8ff;
    border-style: solid;
    transform: scale(1.02);
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

  .status-message {
    color: #2f855a;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: left;
    background: #c6f6d5;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #48bb78;
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

  .file-requirements {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .file-requirements h4 {
    color: #2d3748;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .file-requirements ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .file-requirements li {
    color: #4a5568;
    font-size: 0.8rem;
    margin-bottom: 0.4rem;
    line-height: 1.4;
  }

  .supported-formats {
    margin-top: 1rem;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .supported-formats h5 {
    color: #2d3748;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .format-examples {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.7rem;
    color: #4a5568;
    line-height: 1.5;
  }

  .format-examples code {
    background: #edf2f7;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    color: #2d3748;
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