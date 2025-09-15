<script>
  import { onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';

  export let selectedPatient;
  export let patientData;

  let isDataInitialized = false;
  let new_drug_exposure_date = [],
    day_num = [],
    drug_concept_id = [],
    drug_name = [],
    ICI_lasting = [],
    measurement_date = [],
    grade = [];
  let toxic = [],
    toxic_id = [],
    safe = [],
    day,
    toxicIndexMap = new Map(),
    toxicDrugMap = new Map(),
    uniq_id = [],
    firstDate,
    lastDate,
    days = [],
    safe_id = [],
    ICI_lasting_end,
    drug_exposure_date_end;
  let drug_dose = [];
  let dynamicMargin2 = 120; // 동적으로 계산될 값

  const ICI = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

  // Popper.js 액션 설정
  const [popperRef, popperContent] = createPopperActions({
    placement: 'top',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 10], // 툴팁과 마우스 간 거리 조정
        },
      },
    ],
  });

  let tooltipContent = ''; // 툴팁에 표시할 내용
  let tooltipVisible = false; // 툴팁 표시 여부
  let virtualRef; // 가상 참조 요소

  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];
      new_drug_exposure_date = data.map(row => row.new_drug_exposure_date || row.measurement_date);
      days = data.map(row => Number(row.day_num) || 0);
      day_num = Array.from(new Set(days));
      drug_concept_id = data.map(row => row.drug_concept_id || 0);
      drug_dose = data.map(row => row.drug_name_dose || '');
      uniq_id = Array.from(new Set(drug_concept_id));
      drug_name = data.map(row => row.drug_name || '');
      ICI_lasting = data.map(row => row.ICI_lasting || 0);
      measurement_date = data.map(row => row.measurement_date || 0);
      grade = data.map(row => row.grade || "-1");

      ICI_lasting_end = (data.map(row => row.ICI_lasting).filter(value => value !== null));
      ICI_lasting_end = ICI_lasting_end[ICI_lasting_end.length - 1];
      drug_exposure_date_end = new_drug_exposure_date[new_drug_exposure_date.length - 1];
      firstDate = new Date(new_drug_exposure_date[0]);
      lastDate = new Date(Math.max(new Date(ICI_lasting_end), new Date(drug_exposure_date_end)));
      day = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

      const masterList = await fetchMasterList();
      return { data, masterList };
    }
    return null;
  }

  async function fetchMasterList() {
    const response = await fetch('/Rxnorm_without_blank.json');
    const jsonData = await response.json();
    return jsonData;
  }

  function processData(data, masterList) {
    return new Promise((resolve) => {
      const worker = new Worker('/worker.js');
      worker.postMessage({ data: uniq_id, toxicList: masterList });
      worker.onmessage = function(e) {
        const { toxic_ingredients: toxic_drug, toxic_id: toxicID, safe_id: safeID, toxicIndexMap: toxicmap, toxicDrugNameMap: toxicdrugmap } = e.data;
        toxic = toxic_drug;
        toxic_id = toxicID;
        toxicIndexMap = toxicmap;
        toxicDrugMap = toxicdrugmap;
        safe = safeID.map(safeDrug => {
          const index = drug_concept_id.indexOf(safeDrug);
          return drug_name[index];
        });
        safe = [...new Set(safe.filter(drug => drug !== ""))];
        safe = safe.map(drug => drug.toLowerCase());
        safe_id = [...new Set(safeID.filter(drug => drug !== "0"))];
        
        // 약물명 길이를 기준으로 동적 margin 계산
        calculateDynamicMargin();
        
        resolve();
      };
    });
  }

  // 약물명의 최대 길이를 기준으로 동적 margin 계산
  function calculateDynamicMargin() {
    const allDrugNames = [...toxic, ...safe, ...ICI];
    
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
    dynamicMargin2 = Math.max(120, Math.min(300, maxWidth + 20));
  }

  function draw() {
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacingX = 2;
      const spacingY = 1;
      const boxWidth = 5;
      const boxHeight = 14;
      const gradeHeight = 25;
      const grade_start = 100;
      const ICI_start = grade_start + gradeHeight + 12;
      const ratio_start = ICI_start + ICI.length * (boxHeight + spacingY) + 12;
      const toxic_start = ratio_start + 62;
      const safe_start = toxic.length * (boxHeight + spacingY) + toxic_start + 20;

      function colorBoxes() {
        const toxicBoxes = [];
        const safeBoxesMap = new Map();

        // 독성 박스
        for (let i = 0; i < drug_concept_id.length; i++) {
          const drug_id = drug_concept_id[i];
          const toxicIndex = toxicIndexMap.get(drug_id);
          const dateIndex = days[i];

          if (toxic_id.includes(drug_id)) {
            const x = dynamicMargin2 + (dateIndex - 1) * (boxWidth + spacingX);
            const y = toxic_start + toxicIndex * (boxHeight + spacingY);
            ctx.fillStyle = "#1E88E5";
            ctx.fillRect(x, y, boxWidth, boxHeight);
            toxicBoxes.push({ x, y, width: boxWidth, height: boxHeight, drug_id });
          }
        }

        // 안전 박스
        for (let i = 0; i < drug_concept_id.length; i++) {
          const drugName = drug_name[i].toLowerCase();
          const drugDose = drug_dose[i] || "Unknown dose";
          const dateIndex = days[i];

          if (safe.includes(drugName)) {
            const x = dynamicMargin2 + (dateIndex - 1) * (boxWidth + spacingX);
            const y = safe_start + safe.indexOf(drugName) * (boxHeight + spacingY);
            ctx.fillStyle = "#4CAF50";
            ctx.fillRect(x, y, boxWidth, boxHeight);

            const key = `${drugName}-${dateIndex}`;
            if (!safeBoxesMap.has(key)) {
              safeBoxesMap.set(key, { x, y, width: boxWidth, height: boxHeight, drugName, dateIndex, doses: [] });
            }
            safeBoxesMap.get(key).doses.push(drugDose);
          }
        }

        const safeBoxes = Array.from(safeBoxesMap.values());

        // 마우스 이벤트 처리
        canvas.addEventListener("mousemove", function (e) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // 툴팁 초기화
          tooltipVisible = false;
          tooltipContent = '';

          // 독성 박스 확인
          for (const box of toxicBoxes) {
            if (
              mouseX >= box.x &&
              mouseX <= box.x + box.width &&
              mouseY >= box.y &&
              mouseY <= box.y + box.height
            ) {
              const drugName = toxicDrugMap.get(box.drug_id);
              if (drugName) {
                tooltipContent = drugName;
                tooltipVisible = true;
                virtualRef = {
                  getBoundingClientRect: () => ({
                    width: 0,
                    height: 0,
                    top: e.clientY,
                    right: e.clientX,
                    bottom: e.clientY,
                    left: e.clientX,
                  }),
                };
                popperRef(virtualRef); // 가상 참조 요소 설정
                break;
              }
            }
          }

          // 안전 박스 확인
          for (const box of safeBoxes) {
            if (
              mouseX >= box.x &&
              mouseX <= box.x + box.width &&
              mouseY >= box.y &&
              mouseY <= box.y + box.height
            ) {
              const dosesString = box.doses.join(", ");
              tooltipContent = dosesString;
              tooltipVisible = true;
              virtualRef = {
                getBoundingClientRect: () => ({
                  width: 0,
                  height: 0,
                  top: e.clientY,
                  right: e.clientX,
                  bottom: e.clientY,
                  left: e.clientX,
                }),
              };
              popperRef(virtualRef); // 가상 참조 요소 설정
              break;
            }
          }

          // 캔버스 다시 그리기 (툴팁을 제외한 부분)
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const box of toxicBoxes) {
            ctx.fillStyle = "#1E88E5";
            ctx.fillRect(box.x, box.y, box.width, box.height);
          }
          for (const box of safeBoxes) {
            ctx.fillStyle = "#4CAF50";
            ctx.fillRect(box.x, box.y, box.width, box.height);
          }
        });

        canvas.addEventListener("mouseleave", () => {
          tooltipVisible = false; // 캔버스 밖으로 나가면 툴팁 숨김
        });
      }

      colorBoxes();
    }
  }

  let canvas;

  $: if (isDataInitialized) {
    adjustCanvasWidth();
    adjustCanvasHeight();
    draw();
  }

  $: {
    if (selectedPatient && patientData) {
      isDataInitialized = false;
      initializeData().then(async result => {
        if (result) {
          await processData(result.data, result.masterList);
          isDataInitialized = true;
        }
      });
    }
  }

  function adjustCanvasWidth() {
    const boxWidth = 5;
    const spacingX = 2;
    const newWidth = Math.max(550, 33 + day * (boxWidth + spacingX) + dynamicMargin2);
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
  }

  function adjustCanvasHeight() {
    const boxHeight = 14;
    const spacingY = 1;
    const newHeight = 250 + (toxic.length + safe.length + ICI.length) * (boxHeight + spacingY) + 50;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }
</script>

<canvas bind:this={canvas} style="border:1px solid #000000;"></canvas>

{#if tooltipVisible}
  <div use:popperContent class="tooltip">
    {tooltipContent}
  </div>
{/if}

<style>
  .tooltip {
    background: rgba(0, 0, 0, 0.8);
    color: rgb(255, 255, 255);
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    position: absolute;
    z-index: 10;
  }
</style>