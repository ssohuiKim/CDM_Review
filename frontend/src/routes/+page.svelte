<script>
  import { Card, CardBody, CardFooter, El, Button, CardActions, FileUpload, Icon } from "yesvelte";
  import { goto } from '$app/navigation';
  import { parsedData, groupedPatientData } from '$lib/duckdb';
  import { initializeDuckDB } from '$lib/duckdb';
  import Spinner from '$lib/components/Spinner.svelte';
  import { writable } from 'svelte/store';
  import { detectFileFormat, createDuckDBQuery } from '$lib/fileFormatDetector';

  let files_1;
  let hint_1 = "";
  let state_1 = void 0;
  let formatDetectionResult = null;
  const loading = writable(false); // 로딩 상태를 관리하는 변수

  $: console.log(files_1);

  $: if (files_1 && files_1[0]) {
    const fileExtension = files_1[0].name.split('.').pop().toLowerCase();
    const supportedFormats = ['txt', 'csv', 'tsv'];
    
    if (!supportedFormats.includes(fileExtension)) {
      hint_1 = "지원되는 파일 형식: TXT, CSV, TSV";
      state_1 = "invalid";
      formatDetectionResult = null;
    } else {
      hint_1 = "";
      state_1 = void 0;
      // 파일이 선택되면 미리 포맷 감지 시도
      previewFileFormat();
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
            hint_1 = `⚠️ 파일 포맷 감지 신뢰도가 낮습니다 (${Math.round(result.confidence * 100)}%). 업로드 전 파일을 확인해주세요.`;
            state_1 = "warning";
          } else {
            hint_1 = `✅ ${result.delimiterName} 포맷으로 감지됨 (신뢰도: ${Math.round(result.confidence * 100)}%)`;
            state_1 = "valid";
          }
        } catch (error) {
          console.error('파일 포맷 감지 실패:', error);
          hint_1 = `❌ 파일 포맷 감지 실패: ${error.message}`;
          state_1 = "invalid";
          formatDetectionResult = null;
        }
      };
      reader.readAsText(files_1[0]);
    } catch (error) {
      console.error('파일 읽기 실패:', error);
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
      loading.set(true); // 로딩 시작
      
      try {
        const db = await initializeDuckDB();
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const fileContent = event.target.result;
            
            // 파일 포맷 감지 (이미 감지된 결과가 있으면 재사용)
            let detectionResult = formatDetectionResult;
            if (!detectionResult) {
              detectionResult = detectFileFormat(fileContent, files_1[0].name);
            }
            
            console.log('감지된 파일 포맷:', detectionResult);
            
            // DuckDB에 파일 등록
            await db.registerFileText('data.txt', fileContent);
            const connection = await db.connect();
            
            // 감지된 구분자로 DuckDB 쿼리 생성
            const createTableQuery = createDuckDBQuery('patients', 'data.txt', detectionResult.delimiter);
            console.log('DuckDB 쿼리:', createTableQuery);
            
            await connection.query(createTableQuery);

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
  <El container m="0" p="4">
    <El row tag="h1">CDM-Review</El>
    <El row tag="h3">CDM-Review is a web tool that visualizes data obtained from CDM on patients taking immune checkpoint inhibitors who showed Hepatotoxicity.<br> 
      It would help medical professionals identify patients and make medication-related decisions.</El>
    <El row style="margin-top: 52px;">
      <Card col="7">
        <CardBody>
          <El row tag="strong">Choose a file (TXT, CSV, TSV)</El>
          <El row tag="small" style="color: #666; margin-bottom: 8px;">
            지원 형식: 탭 구분(TSV), 콤마 구분(CSV), 공백 구분(TXT) - 자동 감지
          </El>
          <FileUpload mt="2" state={state_1} bind:files={files_1} />
          <El textColor={state_1 === "valid" ? "success" : state_1 === "warning" ? "warning" : "danger"} tag="small">{hint_1}</El>
          
          {#if formatDetectionResult}
            <El row style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
              <strong>파일 포맷 분석 결과:</strong><br/>
              구분자: {formatDetectionResult.delimiterName}<br/>
              신뢰도: {Math.round(formatDetectionResult.confidence * 100)}%<br/>
              <details style="margin-top: 4px;">
                <summary style="cursor: pointer; color: #007bff;">미리보기 (클릭하여 보기)</summary>
                <pre style="margin: 4px 0; font-size: 11px; white-space: pre-wrap;">{formatDetectionResult.preview.join('\n')}</pre>
              </details>
            </El>
          {/if}
        </CardBody>
        <CardFooter>
          <CardActions>
            <Button color="primary" on:click={handleClick} disabled={!files_1 || !files_1[0] || state_1 === "invalid"}>
              <Icon name="upload" />Upload
            </Button>
          </CardActions>
        </CardFooter>
      </Card>
    </El>
  </El>
{/if}