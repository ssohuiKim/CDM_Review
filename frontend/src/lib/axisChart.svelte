<script>
  import { onMount } from 'svelte';

  // 외부에서 전달받는 값 (DrugChart와 동일)
  export let selectedPatient;
  export let patientData;

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

  // 캔버스 그리기 상수 (중복되어도 괜찮으므로 그대로 작성)
  const marginLeft  = 28;
  const marginRight = 120;
  const spacingX    = 2;
  const spacingY    = 1;
  const boxWidth    = 5;
  const boxHeight   = 14;
  const gradeHeight = 25;
  const gradeStart  = 100;
  const ICI_LIST    = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

  // DrugChart와 동일한 좌표 계산
  const ICI_start  = gradeStart + gradeHeight + 12;
  const ratioStart = ICI_start + ICI_LIST.length * (boxHeight + spacingY) + 12;
  const toxicStart = ratioStart + 62;
  let safeStart;  // 독성 영역 아래 안전 약물 영역 시작


  // 환자 데이터에 따라 독성/안전 약물 배열 초기화  
  // (예시로 drug_name 문자열에 "toxic" 포함 여부로 분류)
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

  // 캔버스 및 축 그리기
  let canvas;
  function drawAxis() {
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

    // ─ 가로 축 (하단에 눈금 및 숫자 표시, 10일 간격)
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";

    for (let col = 1; col <= totalDays; col++) {
      if (col % 10 === 0) {
        const x = marginRight + col * cellWidth;
        drawLine(x, toxicStart, x, safeEnd + 10, 1);
        ctx.textAlign = "right";
        ctx.fillText(col, x + 5, safeEnd + 25);
      }
    }

    // ─ 세로 축 (좌측에 약물 이름 표시)

    // 독성 약물 이름
    toxic.forEach((drug, i) => {
      const y = toxicStart + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, marginRight - 5, y);
    });

    // ICI 약물 (고정 목록)
    ICI_LIST.forEach((drug, i) => {
      const y = ICI_start + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, marginRight - 5, y);
    });

    // 안전 약물 이름
    safeDrugs.forEach((drug, i) => {
      const y = safeStart + i * (boxHeight + spacingY) + 10;
      ctx.textAlign = "right";
      ctx.fillText(drug, marginRight - 5, y);
    });
  }

  // 캔버스 크기를 DrugChart와 맞추기 위한 함수
  function adjustCanvasDimensions() {
    const cellWidth = boxWidth + spacingX;
    let totalDays = 100;
    if (selectedPatient && patientData[selectedPatient]?.length) {
      const days = patientData[selectedPatient].map(row => Number(row.day_num) || 1);
      totalDays = Math.max(...days);
    }
    const newWidth  = 33 + totalDays * cellWidth + 120;
    const newHeight = 250 + (toxic.length + safeDrugs.length + ICI_LIST.length) * (boxHeight + spacingY) + 50;
    canvas.width  = newWidth;
    canvas.style.width  = `${newWidth}px`;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }


// 데이터 초기화 후 캔버스 크기 조절 및 재그리기
$: if (isDataInitialized) {
  adjustCanvasDimensions();
  drawAxis();  // 만약 draw()로 바꿨다면 그에 맞게 호출
}

// selectedPatient나 patientData 변경 시 데이터 재초기화
$: if (selectedPatient && patientData) {
  // 초기화 시작 전에 상태를 false로 설정
  isDataInitialized = false;
  initializeData().then(async result => {
    if (result) {
      // 데이터 초기화 후 processData 실행
      await processData(result.data, result.masterList);
      // processData가 완료되면 캔버스 그리기 위한 플래그를 true로 전환
      isDataInitialized = true;
    }
  });
}

// 컴포넌트가 마운트 될 때도 한 번 초기화 처리 (만약 필요하다면)
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
</script>


<canvas bind:this={canvas} style="border: 1px solid #000; width: 100%; height: 100%;"></canvas>
