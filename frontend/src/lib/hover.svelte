<script>
  import { onMount } from 'svelte';
  // import dateFormat from 'dateformat'; 

  export let selectedPatient;
  export let patientData;

  let isDataInitialized = false;
  let new_drug_exposure_date=[],
      day_num=[],
      drug_concept_id=[],
      drug_name=[],
      ICI_lasting=[],
      measurement_date=[],
      grade=[]
  let toxic=[],
      toxic_id=[],
      safe=[],
      day,
      toxicIndexMap=new Map(),
      toxicDrugMap=new Map(),
      uniq_id=[],
      firstDate,
      lastDate,
      days=[],
      safe_id=[],
      ICI_lasting_end,
      drug_exposure_date_end;
  let drug_dose = [];
  

  const ICI = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];

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
    return jsonData
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


        // 0제거, 중복제거
        safe = [...new Set(safe.filter(drug => drug !== ""))];
        safe = safe.map(drug => drug.toLowerCase());
        safe_id = [...new Set(safeID.filter(drug => drug !== "0"))];

        resolve();
      };
    });
  }

      
  

  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const margin2 = 120;
      const margin1 = 28
      const spacingX = 2;
      const spacingY = 1;
      const boxWidth = 5;
      const boxHeight = 14;
      const gradeHeight = 25;
      const grade_start = 100;
      const ICI_start = grade_start + gradeHeight + 12;
      const ratio_start = ICI_start + ICI.length*(boxHeight + spacingY) + 12;
      const toxic_start = ratio_start + 62;
      const safe_start = toxic.length*(boxHeight + spacingY) + toxic_start + 20;
      const safe_end = safe.length*(boxHeight + spacingY) + safe_start;
      

      function colorBoxes() {
        const toxicBoxes = []; // 독성 박스 정보
        const safeBoxesMap = new Map(); // 안전 박스를 날짜별로 저장하기 위한 Map

        // 독성 박스 처리
        for (let i = 0; i < drug_concept_id.length; i++) {
            const drug_id = drug_concept_id[i];
            const toxicIndex = toxicIndexMap.get(drug_id);
            const dateIndex = days[i]; // 날짜 인덱스 (1-based)

            if (toxic_id.includes(drug_id)) {
                const x = margin2 + (dateIndex - 1) * (boxWidth + spacingX);
                const y = toxic_start + toxicIndex * (boxHeight + spacingY);

                ctx.fillStyle = "#1E88E5"; // 파란색으로 박스 채우기
                ctx.fillRect(x, y, boxWidth, boxHeight);

                toxicBoxes.push({
                    x: x,
                    y: y,
                    width: boxWidth,
                    height: boxHeight,
                    drug_id: drug_id, // 약물 ID 저장
                });
            }
        }

        // 안전 박스 처리
        for (let i = 0; i < drug_concept_id.length; i++) {
            const drugName = drug_name[i].toLowerCase();
            const drugDose = drug_dose[i] || "Unknown dose"; // 복용 용량
            const dateIndex = days[i]; // 날짜 인덱스 (1-based)

            if (safe.includes(drugName)) {
                const x = margin2 + (dateIndex - 1) * (boxWidth + spacingX);
                const y = safe_start + safe.indexOf(drugName) * (boxHeight + spacingY);

                ctx.fillStyle = "#4CAF50"; // 초록색으로 박스 채우기
                ctx.fillRect(x, y, boxWidth, boxHeight);

                // 같은 날짜에 같은 약물이 여러 번 복용된 경우를 처리
                const key = `${drugName}-${dateIndex}`;
                if (!safeBoxesMap.has(key)) {
                    safeBoxesMap.set(key, {
                        x: x,
                        y: y,
                        width: boxWidth,
                        height: boxHeight,
                        drugName: drugName,
                        dateIndex: dateIndex,
                        doses: [], // 여러 용량을 저장할 배열
                    });
                }
                safeBoxesMap.get(key).doses.push(drugDose); // 같은 날짜에 용량 추가
            }
        }

        const safeBoxes = Array.from(safeBoxesMap.values()); // Map을 배열로 변환

        // 캔버스에 마우스 이벤트 추가
        canvas.addEventListener("mousemove", function (e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 캔버스 초기화
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 모든 독성 박스를 다시 그리기
            for (const box of toxicBoxes) {
                ctx.fillStyle = "#1E88E5";
                ctx.fillRect(box.x, box.y, box.width, box.height);
            }

            // 모든 안전 박스를 다시 그리기
            for (const box of safeBoxes) {
                ctx.fillStyle = "#4CAF50";
                ctx.fillRect(box.x, box.y, box.width, box.height);
            }

            // 독성 박스 위에 마우스가 있으면 drug_name 표시
            for (const box of toxicBoxes) {
                if (
                    mouseX >= box.x &&
                    mouseX <= box.x + box.width &&
                    mouseY >= box.y &&
                    mouseY <= box.y + box.height
                ) {
                    const drugName = toxicDrugMap.get(box.drug_id); // drug_name 조회
                    if (drugName) {
                        ctx.fillStyle = "black";
                        ctx.font = "12px Arial";
                        ctx.fillText(`${drugName}`, box.x, box.y - 5);
                    }
                }
            }

            // 안전 박스 위에 마우스가 있으면 복용 용량 표시
            for (const box of safeBoxes) {
                if (
                    mouseX >= box.x &&
                    mouseX <= box.x + box.width &&
                    mouseY >= box.y &&
                    mouseY <= box.y + box.height
                ) {
                    const dosesString = box.doses.join(", "); // 쉼표로 용량을 연결
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    ctx.fillText(dosesString, box.x, box.y - 5);
                }
            }
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
const newWidth = 33 + day * (boxWidth + spacingX) +  120;
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

<canvas bind:this={canvas} style="border:1px solid #000000; width 1900; height:2100;"></canvas>