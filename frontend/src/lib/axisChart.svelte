<script>
  import { onMount } from 'svelte';

  // 외부에서 전달받는 값 (DrugChart와 동일)
  export let selectedPatient;
  export let patientData;
  export let type;  // "row" 또는 "col"
  export let minWidth = 550; // DrugChart에서 계산된 최소 너비 값

  let isDataInitialized = false;
  let newDrugExposureDates = [],
      days = [],
      dayNums = [],
      drugConceptIds = [],
      drugNames = [],
      ICI_lasting = [],
      measurementDates = [],
      grades = [];
  
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

  // 캔버스 그리기 상수
  const marginLeft  = 28;
  let dynamicMarginRight = 120; // 동적으로 조정되는 marginRight
  const spacingX    = 2;
  const spacingY    = 1;
  const boxWidth    = 5;
  const boxHeight   = 14;
  const gradeHeight = 25;
  const gradeStart  = 100;
  const ICI_LIST    = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

  // 약물명 길이에 따라 margin을 동적으로 계산하는 함수
  function calculateDynamicMargin() {
    if (!canvas || !canvas.getContext) return 120;
    
    const ctx = canvas.getContext("2d");
    ctx.font = "12px Arial";
    
    let maxWidth = 0;
    const allDrugs = [...toxic, ...ICI_LIST, ...safeDrugs];
    
    allDrugs.forEach(drugName => {
      if (drugName) {
        const textWidth = ctx.measureText(drugName).width;
        maxWidth = Math.max(maxWidth, textWidth);
      }
    });
    
    // 기본 여백 + 텍스트 최대 길이 + 추가 여백
    return Math.max(120, maxWidth + 20);
  }

  // DrugChart와 동일한 좌표 계산
  const ICI_start  = gradeStart + gradeHeight + 12;
  const ratioStart = ICI_start + ICI_LIST.length * (boxHeight + spacingY) + 12;
  const toxicStart = ratioStart + 62;
  let safeStart;

  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];
      newDrugExposureDates = data.map(row => row.new_drug_exposure_date || row.measurement_date);
      days = data.map(row => Number(row.day_num) || 1);
      dayNums = Array.from(new Set(days));

      drugConceptIds = data.map(row => row.drug_concept_id || 0);
      uniqDrugIds = Array.from(new Set(drugConceptIds));
      drugNames = data.map(row => row.drug_name || '');
      ICI_lasting = data.map(row => row.ICI_lasting || 0);
      measurementDates = data.map(row => row.measurement_date || 0);
      grades = data.map(row => row.grade || "-1");

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

  async function fetchMasterList() {
    const response = await fetch('/Rxnorm_without_blank.json');
    return await response.json();
  }

  function processData(data, masterList) {
    return new Promise((resolve) => {
      const worker = new Worker('/worker.js');
      worker.postMessage({ data: uniqDrugIds, toxicList: masterList });
      worker.onmessage = function(e) {
          const { toxic_ingredients, toxic_id: toxicID, safe_id: safeID, toxicIndexMap: toxicmap } = e.data;
          toxic = toxic_ingredients;
          toxicIds = toxicID;
          toxicIndexMap = toxicmap;

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

  let canvas;
  function drawAxis() {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // safeStart 및 safeEnd 계산
    safeStart = toxicStart + toxic.length * (boxHeight + spacingY) + 20;
    const safeEnd = safeStart + safeDrugs.length * (boxHeight + spacingY);
    const cellWidth = boxWidth + spacingX;

    if (type === "row") {
      drawBottomAxis(ctx, cellWidth, safeEnd);
    } else if (type === "col") {
      drawLeftAxis(ctx);
    }
  }

  function drawBottomAxis(ctx, cellWidth, safeEnd) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    for (let col = 1; col <= totalDays; col++) {
      if (col % 10 === 0) {
        const x = dynamicMarginRight + col * cellWidth;
        ctx.textAlign = "right";
        ctx.fillText(col, x + 5, safeEnd + 25);
      }
    }
  }

  function drawLeftAxis(ctx) {
    ctx.font = "12px Arial";
    toxic.forEach((drug, i) => {
      const y = toxicStart + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, dynamicMarginRight - 5, y);
    });
    ICI_LIST.forEach((drug, i) => {
      const y = ICI_start + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, dynamicMarginRight - 5, y);
    });
    safeDrugs.forEach((drug, i) => {
      const y = safeStart + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, dynamicMarginRight - 5, y);
    });
  }

  // 사용자가 원하는 방식으로 adjustCanvasDimensions 함수 그대로 사용
  function adjustCanvasDimensions() {
    // 약물명 길이에 따라 margin을 먼저 계산
    dynamicMarginRight = calculateDynamicMargin();
    
    const cellWidth = boxWidth + spacingX;
    let calculatedWidth = 33 + totalDays * cellWidth + dynamicMarginRight;
    if (type === "col") calculatedWidth = dynamicMarginRight;
    
    const newWidth = Math.max(minWidth, calculatedWidth); // minWidth 사용

    const newHeight = 250 + (toxic.length + safeDrugs.length + ICI_LIST.length) * (boxHeight + spacingY) + 50;
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }

  // 데이터 초기화 후 캔버스 크기 조절 및 재그리기
  $: if (isDataInitialized) {
    adjustCanvasDimensions();
    drawAxis();
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

  onMount(() => {
    if (selectedPatient && patientData) {
      isDataInitialized = false;
      initializeData().then(async result => {
        if (result) {
          await processData(result.data, result.masterList);
          isDataInitialized = true;
        }
      });
    }
  });

  // canvas에 아래와 같은 inline 스타일을 적용합니다.
  $: canvasStyle = type === "row"
    ? "width: 100%; height: 100%; position: absolute; bottom: 0; left: 0;"
    : "width: 100%; height: 100%;";
</script>

{#if selectedPatient}
<canvas bind:this={canvas} style={canvasStyle}></canvas>
{/if}


