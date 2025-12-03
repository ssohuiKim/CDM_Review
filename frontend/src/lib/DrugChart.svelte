<script>
  import { onMount } from 'svelte';
  import { drugClassification, chartComputedData } from './duckdb.js';

  // 외부에서 전달받는 값
  export let selectedPatient;
  export let patientData;
  
  // 외부로 내보낼 값
  export let dynamicMarginRight = 120; // 계산된 동적 margin 값을 외부로 노출
  export let minWidth = 550;

  // 데이터 관련 변수
  let isDataInitialized = false;
  let newDrugExposureDates = [],
      days = [],
      dayNums = [],
      drugConceptIds = [],
      drugNames = [],
      ICI_lasting = [],
      measurementDates = [],
      grades = [],
      diagnosisGroup = '',
      gender = '',
      age = null;
  
  let toxic = [],
      toxicIds = [],
      safeDrugs = [],
      safeDrugIds = [],
      toxicIndexMap = new Map(),
      uniqDrugIds = [];
  
  let firstDate, lastDate,
      totalDays = 0,
      ICI_lasting_end,
      drugExposureDateEnd;
  
  let toxicNum = [],
      safeNum = [];
  
  // 날짜 포맷팅 함수
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ICI 약물 목록 (대소문자 무시)
  const ICI_LIST = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

  // 캔버스 그리기 상수 (주로 픽셀 단위)
  const marginLeft = 28;
  const spacingX = 2;
  const spacingY = 1;
  const boxWidth = 5;
  const boxHeight = 14;
  const gradeHeight = 25;
  const gradeStart = 100;
  const ICI_start = gradeStart + gradeHeight + 12;
  const ratioStart = ICI_start + ICI_LIST.length * (boxHeight + spacingY) + 12;
  const toxicStart = ratioStart + 62;
  let safeStart;

  // 데이터 초기화 (선택된 환자와 환자 데이터가 있을 때)
  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];

      newDrugExposureDates = data.map(row => row.new_drug_exposure_date || row.measurement_date);
      days = data.map(row => Number(row.day_num) || 1);  // day_num이 1부터 시작한다고 가정
      dayNums = Array.from(new Set(days));

      drugConceptIds = data.map(row => row.drug_concept_id || 0);
      uniqDrugIds = Array.from(new Set(drugConceptIds));  
      drugNames = data.map(row => row.drug_name || '');
      ICI_lasting = data.map(row => row.ICI_lasting || 0);
      measurementDates = data.map(row => row.measurement_date || 0);
      grades = data.map(row => row.grade || "-1");
      
      // diagnosis_group 값 설정 (첫 번째 row에서 가져오기)
      diagnosisGroup = data[0]?.diagnosis_group || 'Unknown diagnosis';
      
      // 성별과 나이 정보 추출 (첫 번째 row에서 가져오기)
      gender = data[0]?.gender_source_value || data[0]?.gender || '';
      age = data[0]?.age || data[0]?.age_at_index || null;
      
      minWidth = Math.max(0, 380 + ((diagnosisGroup || '').length * 5));

      const ICI_values = data.map(row => row.ICI_lasting).filter(value => value != null);
      ICI_lasting_end = ICI_values.length ? ICI_values[ICI_values.length - 1] : null;
      drugExposureDateEnd = newDrugExposureDates[newDrugExposureDates.length - 1];
      firstDate = new Date(newDrugExposureDates[0]);
      lastDate = new Date(Math.max(new Date(ICI_lasting_end), new Date(drugExposureDateEnd)));
      totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

      toxicNum = Array(totalDays).fill(0);
      safeNum = Array(totalDays).fill(0);
      
      const masterList = await fetchMasterList();
      return { data, masterList };
    }
    return null;
  }

  // 마스터 리스트 (JSON 파일) 불러오기
  async function fetchMasterList() {
    const response = await fetch('/Rxnorm_without_blank.json');
    return await response.json();
  }

  // Worker를 이용해 독성(toxic) 및 안전(safe) 약물 데이터를 처리
  function processData(data, masterList) {
    return new Promise((resolve) => {
      const worker = new Worker('/worker.js');
      worker.postMessage({ data: uniqDrugIds, toxicList: masterList });
      worker.onmessage = function(e) {
          const { toxic_ingredients, toxic_id: toxicID, safe_id: safeID, toxicIndexMap: toxicmap } = e.data;
          toxic = toxic_ingredients;
          toxicIds = toxicID;
          toxicIndexMap = toxicmap;

          // safe 약물 이름 추출 (소문자 변환 후 중복 제거)
          safeDrugs = safeID
            .map(id => {
              const index = drugConceptIds.indexOf(id);
              return index >= 0 ? drugNames[index] : '';
            })
            .filter(drug => drug !== "")
            .map(drug => drug.toLowerCase());
          safeDrugs = Array.from(new Set(safeDrugs));
          safeDrugIds = Array.from(new Set(safeID.filter(id => id !== "0")));

          // Update shared store for survey.svelte to use
          drugClassification.set({
              toxic: toxic,
              toxicIds: toxicIds,
              safe: safeDrugs,
              safeIds: safeDrugIds
          });
          console.log('=== DrugChart: Updated drugClassification store ===');
          console.log('Toxic drugs:', toxic);
          console.log('Safe drugs:', safeDrugs);

          // 약물명 길이를 기준으로 동적 margin 계산
          calculateDynamicMargin();

          resolve();
      };
    });
  }

  // 약물명의 최대 길이를 기준으로 동적 margin 계산
  function calculateDynamicMargin() {
    const allDrugNames = [...toxic, ...safeDrugs, ...ICI_LIST];
    
    // 임시 캔버스를 생성하여 텍스트 폭 측정
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '12px Arial';
    
    let maxWidth = 0;
    allDrugNames.forEach(drugName => {
      const textWidth = tempCtx.measureText(drugName).width;
      if (textWidth > maxWidth) {
        maxWidth = textWidth;
      }
    });
    
    // 최소 120px, 최대 300px로 제한하고 여유공간 20px 추가
    dynamicMarginRight = Math.max(120, Math.min(300, maxWidth + 20));
  }

  // 성별 기호 반환 함수
  function getGenderSymbol(genderValue) {
    if (!genderValue) return '';
    const genderStr = String(genderValue).toLowerCase();
    if (genderStr.includes('f') || genderStr.includes('여')) return '♀';
    if (genderStr.includes('m') || genderStr.includes('남')) return '♂';
    return '';
  }

  // 성별 텍스트 반환 함수
  function getGenderText(genderValue) {
    if (!genderValue) return '';
    const genderStr = String(genderValue).toLowerCase();
    if (genderStr.includes('f') || genderStr.includes('여')) return 'Female';
    if (genderStr.includes('m') || genderStr.includes('남')) return 'Male';
    return genderValue;
  }

  // 캔버스 그리기 함수
  function draw() {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    safeStart = toxicStart + toxic.length * (boxHeight + spacingY) + 20;
    const safeEnd = safeStart + safeDrugs.length * (boxHeight + spacingY);
    const cellWidth = boxWidth + spacingX;

    const drawLine = (x1, y1, x2, y2, width) => {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const writeText = (text, x, y, size, align = 'left', color = 'black') => {
      ctx.font = `${size}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };

    // 날짜 포맷 함수
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    };

    const writeDrugNames = () => {
      writeText("Hepatotoxicity", dynamicMarginRight - 5, gradeStart+16, 12, 'right');
      toxic.forEach((drug, i) => {
        const y = toxicStart + i * (boxHeight + spacingY) + 10;
        writeText(drug, dynamicMarginRight - 5, y, 12, 'right');
      });
      safeDrugs.forEach((drug, i) => {
        const y = safeStart + i * (boxHeight + spacingY) + 10;
        writeText(drug, dynamicMarginRight - 5, y, 12, 'right');
      });
      ICI_LIST.forEach((drug, i) => {
        const y = ICI_start + i * (boxHeight + spacingY) + 10;
        writeText(drug, dynamicMarginRight - 5, y, 12, 'right');
      });
    };

    const drawGridLines = () => {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";

      for (let col = 1; col <= totalDays; col++) {
        if (col % 10 === 0) {
          const x = dynamicMarginRight + col * cellWidth;
          drawLine(x, toxicStart, x, safeEnd + 10, 1);
          ctx.fillText(col, x + 5, safeEnd + 25);
        }
      }
    };

    const drawGrid = () => {
      ctx.fillStyle = "gainsboro";
      const drawRows = (startY, rowCount, width, height) => {
        for (let row = 0; row < rowCount; row++) {
          for (let col = 0; col < totalDays; col++) {
            const x = dynamicMarginRight + col * cellWidth;
            const y = startY + row * (height + spacingY);
            ctx.fillRect(x, y, width, height);
          }
        }
      };
      drawRows(gradeStart, 1, boxWidth, gradeHeight);       // grade 영역
      drawRows(ICI_start, ICI_LIST.length, boxWidth, boxHeight);
      drawRows(ratioStart, 1, boxWidth, 50);
      drawRows(safeStart, safeDrugs.length, boxWidth, boxHeight);
      drawRows(toxicStart, toxic.length, boxWidth, boxHeight);
    };

    const colorGrade = () => {
      const gradeColors = {"0": "#FEE3D6", "1": "#FCBEA5", "2": "#FC9575", "3": "#EF3B2C", "4": "#CA171C"};
      grades.forEach((gradeVal, i) => {
        const dayIndex = days[i] - 1; // 0 기반 인덱스
        if (gradeColors.hasOwnProperty(gradeVal)) {
          ctx.fillStyle = gradeColors[gradeVal];
          const x = dynamicMarginRight + dayIndex * cellWidth;
          ctx.fillRect(x, gradeStart, boxWidth, gradeHeight);
        }
      });
    };

    const colorToxic = () => {
      drugConceptIds.forEach((drugId, i) => {
        const toxicIndex = toxicIndexMap.get(drugId);
        const dayIndex = days[i] - 1;
        if (toxicIds.includes(drugId) && toxicIndex !== undefined) {
          toxicNum[dayIndex]++;
          const x = dynamicMarginRight + dayIndex * cellWidth;
          const y = toxicStart + toxicIndex * (boxHeight + spacingY);
          ctx.fillStyle = "#1E88E5";
          ctx.fillRect(x, y, boxWidth, boxHeight);
        }
      });
    };

    const colorSafe = () => {
      drugConceptIds.forEach((_, i) => {
        const drug = drugNames[i].toLowerCase();
        const dayIndex = days[i] - 1;
        if (safeDrugs.includes(drug)) {
          safeNum[dayIndex]++;
          const x = dynamicMarginRight + dayIndex * cellWidth;
          const y = safeStart + safeDrugs.indexOf(drug) * (boxHeight + spacingY);
          ctx.fillStyle = "#4CAF50";
          ctx.fillRect(x, y, boxWidth, boxHeight);
        }
      });
    };

    const colorICI = () => {
      // Track ICI exposure periods for sharing with survey
      const iciExposureData = {};  // { drugName: [{ startDay, endDay, startDate, endDate }] }
      const iciDrugsList = [];

      ICI_lasting.forEach((duration, i) => {
        const exposureDate = newDrugExposureDates[i];
        const ICI_drug = drugNames[i];
        if (duration != 0) {
          const durationDate = new Date(duration);
          const exposure = new Date(exposureDate);
          const index = ICI_LIST.findIndex(drug => drug.toLowerCase() === ICI_drug.toLowerCase());
          if (index >= 0) {
            const drugDuration = Math.ceil((durationDate - exposure) / (1000 * 60 * 60 * 24)) + 1;
            const dayIndex = days[i] - 1;
            const x = dynamicMarginRight + dayIndex * cellWidth;
            const y = ICI_start + index * (boxHeight + spacingY);
            ctx.fillStyle = "#FFC107";
            ctx.fillRect(x, y, boxWidth, boxHeight);
            const shortHeight = boxHeight / 2;
            const shortY = y + (boxHeight - shortHeight) / 2;
            ctx.fillRect(x + boxWidth, shortY, (drugDuration - 1) * cellWidth, shortHeight);

            // Track ICI exposure period data
            const drugNameNormalized = ICI_LIST[index];
            if (!iciDrugsList.includes(drugNameNormalized)) {
              iciDrugsList.push(drugNameNormalized);
            }

            if (!iciExposureData[drugNameNormalized]) {
              iciExposureData[drugNameNormalized] = [];
            }

            const startDay = dayIndex + 1;  // Convert back to 1-based day
            const endDay = startDay + drugDuration - 1;

            // Check if this overlaps or extends an existing period, or is a new period (rechallenge)
            const existingPeriods = iciExposureData[drugNameNormalized];
            let merged = false;

            for (let p = 0; p < existingPeriods.length; p++) {
              const period = existingPeriods[p];
              // If within 14 days of existing period, merge them
              if (startDay <= period.end + 14 && endDay >= period.start - 14) {
                period.start = Math.min(period.start, startDay);
                period.end = Math.max(period.end, endDay);
                period.startDate = startDay < period.start ? exposureDate : period.startDate;
                period.endDate = endDay > period.end ? durationDate.toISOString().split('T')[0] : period.endDate;
                merged = true;
                break;
              }
            }

            if (!merged) {
              existingPeriods.push({
                start: startDay,
                end: endDay,
                startDate: exposureDate,
                endDate: durationDate.toISOString().split('T')[0]
              });
            }
          }
        }
      });

      // Sort periods by start day for each drug
      Object.keys(iciExposureData).forEach(drug => {
        iciExposureData[drug].sort((a, b) => a.start - b.start);
      });

      // Compute grade changes
      const gradeMap = new Map();
      grades.forEach((gradeVal, i) => {
        const dayIndex = days[i];
        if (gradeVal !== "-1" && gradeVal !== null && gradeVal !== undefined) {
          gradeMap.set(dayIndex, gradeVal);
        }
      });

      // Convert to sorted array and deduplicate consecutive same grades
      const gradeChanges = [];
      let lastGrade = null;
      Array.from(gradeMap.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([day, grade]) => {
          if (grade !== lastGrade) {
            gradeChanges.push({ day, grade });
            lastGrade = grade;
          }
        });

      // Update shared store with computed data
      chartComputedData.set({
        totalDays: totalDays,
        firstDate: firstDate ? firstDate.toISOString().split('T')[0] : null,
        lastDate: lastDate ? lastDate.toISOString().split('T')[0] : null,
        iciExposurePeriods: iciExposureData,
        gradeChanges: gradeChanges,
        iciDrugs: iciDrugsList,
        diagnosisGroup: diagnosisGroup
      });

      console.log('=== DrugChart: Updated chartComputedData store ===');
      console.log('ICI Exposure Periods:', iciExposureData);
      console.log('Grade Changes:', gradeChanges);
    };

    // 이름 기준 고유 집계로 비율 그리기
    const colorRatio = () => {
      // 0) 멤버십 체크는 Set로 (성능 + 정확)
      const toxicIdSet   = new Set((toxicIds || toxic_id || []).map(String));
      const toxicNameSet = new Set((toxic || []).map(n => String(n).toLowerCase().trim()));

      // 1) 날짜별 고유 약물 이름 집합(전체/독성)
      const dailyAllNames = Array.from({ length: totalDays }, () => new Set());
      const dailyToxicNames = Array.from({ length: totalDays }, () => new Set());

      const normalize = s => String(s ?? '').toLowerCase().trim();
      const cw = typeof cellWidth !== 'undefined' ? cellWidth : (boxWidth + spacingX);

      for (let i = 0; i < (drugNames || drug_name).length; i++) {
        const d0 = ((days?.[i] ?? 0) - 1);      // days가 1부터 시작한다고 가정
        if (d0 < 0 || d0 >= totalDays) continue;

        const name = normalize((drugNames || drug_name)[i]);
        if (!name) continue;

        dailyAllNames[d0].add(name);

        // 독성 판정: 이름이 독성 목록에 있거나, ID가 독성 ID에 있으면 독성으로 간주
        const idStr = String((drugConceptIds || drug_concept_id)?.[i] ?? '');
        if (toxicNameSet.has(name) || toxicIdSet.has(idStr)) {
          dailyToxicNames[d0].add(name);
        }
      }

      // 2) 그리기 (분모 = 그날의 고유 약물 수, 분자 = 그날의 고유 독성 약물 수)
      for (let i = 0; i < totalDays; i++) {
        const total = dailyAllNames[i].size;
        if (total === 0) continue;

        const toxCount  = dailyToxicNames[i].size;
        const safeCount = Math.max(0, total - toxCount);

        const ratioSafe  = safeCount / total;
        const ratioToxic = toxCount  / total;

        const x = dynamicMarginRight + i * cw;
        const safeY = ratioStart + 50 - ratioSafe * 50;

        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(x, safeY, boxWidth, ratioSafe * 50);

        ctx.fillStyle = "#1E88E5";
        ctx.fillRect(x, ratioStart, boxWidth, ratioToxic * 50);
      }
    };


    
    // 환자 정보 표시
    const genderSymbol = getGenderSymbol(gender);
    const genderText = getGenderText(gender);
    const ageText = age ? `${age} years` : '';
    
    // Patient info는 HTML 오버레이로 표시하므로 여기서는 제거
    
    drawLine(dynamicMarginRight - 10, ratioStart, dynamicMarginRight - 10, ratioStart + 50, 2.3);
    drawLine(dynamicMarginRight - 10, ratioStart + 1, dynamicMarginRight - 22, ratioStart + 1, 2.3);
    drawLine(dynamicMarginRight - 10, ratioStart + 24, dynamicMarginRight - 22, ratioStart + 24, 2.3);
    drawLine(dynamicMarginRight - 10, ratioStart + 49, dynamicMarginRight - 22, ratioStart + 49, 2.3);
    writeText('0', dynamicMarginRight - 30, ratioStart + 4, 12, 'right');
    writeText('0.5', dynamicMarginRight - 30, ratioStart + 27, 12, 'right');
    writeText('1', dynamicMarginRight - 30, ratioStart + 52, 12, 'right');
  
    // --- 순서대로 캔버스 그리기 ---
    drawGrid();
    colorGrade();
    writeDrugNames();
    colorToxic();
    colorSafe();
    colorICI();
    colorRatio();
    drawGridLines();
  }

  let canvas;
  
  // 캔버스 크기 조절 함수 (High-DPI 지원)
  function adjustCanvasDimensions() {
    const cellWidth = boxWidth + spacingX;
    const calculatedWidth = 33 + totalDays * cellWidth + dynamicMarginRight;
    const newWidth = Math.max(minWidth, calculatedWidth);
    const newHeight = 250 + (toxic.length + safeDrugs.length + ICI_LIST.length) * (boxHeight + spacingY) + 50;

    // High-DPI (Retina) 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;

    // Canvas 내부 해상도 (물리적 픽셀)
    canvas.width = newWidth * dpr;
    canvas.height = newHeight * dpr;

    // Canvas 표시 크기 (CSS 픽셀)
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // Canvas context를 DPR에 맞게 스케일
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  // 데이터 초기화 후 캔버스 크기 조절 및 재그리기
  $: if (isDataInitialized) {
    adjustCanvasDimensions();
    draw();
  }

  // selectedPatient나 patientData 변경 시 데이터 재초기화
  $: if (selectedPatient && patientData) {
    isDataInitialized = false;
    initializeData().then(async result => {
      if (result) {
        await processData(result.data, result.masterList);
        isDataInitialized = true;
      }
    });
  }
</script>

<div class="chart-container">
  <canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas>
  
  <!-- Patient Info Card Overlay -->
  {#if selectedPatient && isDataInitialized}
    <div class="patient-info-overlay">
      <div class="patient-header">
        <img src="/user.png" alt="Patient" class="patient-avatar-img" />
        <div class="patient-title-section">
          <h3>Patient {selectedPatient}</h3>
          {#if gender || age}
            <span class="gender-age-info">
              {getGenderSymbol(gender)} {getGenderText(gender)}, {age} years old
            </span>
          {/if}
        </div>
      </div>
      
      <div class="info-items">
        <div class="info-row">
          {#if diagnosisGroup}
            <div class="info-item">
              <img src="/pulse.png" alt="Diagnosis" class="info-icon" />
              <span>{diagnosisGroup}</span>
            </div>
          {/if}
          
          {#if firstDate && lastDate}
            <div class="info-item">
              <img src="/period.png" alt="Period" class="info-icon" />
              <span>Treatment Period: {formatDate(firstDate)} ~ {formatDate(lastDate)}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .patient-info-overlay {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 10;
    pointer-events: none;
  }

  .patient-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: -10px;    /* patient number 밑에 글자 붙이기 */
  }

  .patient-avatar-img {
    width: 50px;
    height: 50px;
    transform: translate(1px, 7px); /* 오른쪽으로 1, 밑으로 3 내림 */
  }

  .patient-title-section {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: -5px;
  }

  .patient-title-section h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 650;
    color: #1f2937;
  }

  .gender-age-info {
    background: #dbeafe;
    color: #1d4ed8;
    padding: 3px 7px;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .info-items {
    display: flex;
    flex-direction: column;
    gap: -10px;
    margin-left: 60px; /* 왼쪽 여백 */
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9rem;
    color: #6b7280;
  }

  .info-icon {
    width: 15px;
    height: 15px;
    opacity: 0.8;
  }
</style>