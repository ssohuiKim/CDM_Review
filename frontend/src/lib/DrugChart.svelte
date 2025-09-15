<script>
  import { onMount } from 'svelte';

  // 외부에서 전달받는 값
  export let selectedPatient;
  export let patientData;

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
      diagnosisGroup = '';
  
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
  
  // ICI 약물 목록 (대소문자 무시)
  const ICI_LIST = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

  // 캔버스 그리기 상수 (주로 픽셀 단위)
  const marginLeft = 28;
  const marginRight = 120;
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
          resolve();
      };
    });
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

    const writeDrugNames = () => {
      toxic.forEach((drug, i) => {
        const y = toxicStart + i * (boxHeight + spacingY) + 10;
        writeText(drug, marginRight - 5, y, 12, 'right');
      });
      safeDrugs.forEach((drug, i) => {
        const y = safeStart + i * (boxHeight + spacingY) + 10;
        writeText(drug, marginRight - 5, y, 12, 'right');
      });
      ICI_LIST.forEach((drug, i) => {
        const y = ICI_start + i * (boxHeight + spacingY) + 10;
        writeText(drug, marginRight - 5, y, 12, 'right');
      });
    };

    const drawGridLines = () => {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";

      for (let col = 1; col <= totalDays; col++) {
        if (col % 10 === 0) {
          const x = marginRight + col * cellWidth;
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
            const x = marginRight + col * cellWidth;
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
          const x = marginRight + dayIndex * cellWidth;
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
          const x = marginRight + dayIndex * cellWidth;
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
          const x = marginRight + dayIndex * cellWidth;
          const y = safeStart + safeDrugs.indexOf(drug) * (boxHeight + spacingY);
          ctx.fillStyle = "#4CAF50";
          ctx.fillRect(x, y, boxWidth, boxHeight);
        }
      });
    };

    const colorICI = () => {
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
            const x = marginRight + dayIndex * cellWidth;
            const y = ICI_start + index * (boxHeight + spacingY);
            ctx.fillStyle = "#FFC107";
            ctx.fillRect(x, y, boxWidth, boxHeight);
            const shortHeight = boxHeight / 2;
            const shortY = y + (boxHeight - shortHeight) / 2;
            ctx.fillRect(x + boxWidth, shortY, (drugDuration - 1) * cellWidth, shortHeight);
          }
        }
      });
    };

    const colorRatio = () => {
      for (let i = 0; i < totalDays; i++) {
        const total = toxicNum[i] + safeNum[i];
        const ratioSafe = total === 0 ? 0 : safeNum[i] / total;
        const x = marginRight + i * cellWidth;
        const safeY = ratioStart + 50 - ratioSafe * 50;
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(x, safeY, boxWidth, ratioSafe * 50);
  
        const ratioToxic = total === 0 ? 0 : toxicNum[i] / total;
        ctx.fillStyle = "#1E88E5";
        ctx.fillRect(x, ratioStart, boxWidth, ratioToxic * 50);
      }
    };

    
    writeText('Patient number: ' + selectedPatient, marginRight, 60, 12);
    writeText('Type of cancer diagnosis: ' + diagnosisGroup, marginRight, 75, 12);
  
    drawLine(marginRight - 10, ratioStart, marginRight - 10, ratioStart + 50, 2.3);
    drawLine(marginRight - 10, ratioStart + 1, marginRight - 22, ratioStart + 1, 2.3);
    drawLine(marginRight - 10, ratioStart + 24, marginRight - 22, ratioStart + 24, 2.3);
    drawLine(marginRight - 10, ratioStart + 49, marginRight - 22, ratioStart + 49, 2.3);
    writeText('0', marginRight - 30, ratioStart + 4, 12, 'right');
    writeText('0.5', marginRight - 30, ratioStart + 27, 12, 'right');
    writeText('1', marginRight - 30, ratioStart + 52, 12, 'right');
  
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
  
  // 캔버스 크기 조절 함수
  function adjustCanvasDimensions() {
    const cellWidth = boxWidth + spacingX;
    const newWidth = 33 + totalDays * cellWidth + 120;
    const newHeight = 250 + (toxic.length + safeDrugs.length + ICI_LIST.length) * (boxHeight + spacingY) + 50;
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
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

<canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas>