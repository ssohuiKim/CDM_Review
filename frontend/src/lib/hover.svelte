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
        uniq_id=[],
        firstDate,
        lastDate,
        days=[],
        safe_id=[],
        ICI_lasting_end,
        drug_exposure_date_end;
    let toxic_num = [],
        safe_num = [];
    
  
    const ICI = ["Atezolizumab", "Nivolumab", "Pembrolizumab", "Ipilimumab"];
  
    async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];
  
      new_drug_exposure_date = data.map(row => row.new_drug_exposure_date || row.measurement_date);
      days = data.map(row => Number(row.day_num) || 0);                                
      day_num = Array.from(new Set(days));
  
      drug_concept_id = data.map(row => row.drug_concept_id || 0);
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
      toxic_num = Array.from({ length: day }, () => 0);
      safe_num = Array.from({ length: day }, () => 0);
      
      const masterList = await fetchMasterList();
      return { data, masterList };
      }
      return null;
    }
  
    async function fetchMasterList() {
      const response = await fetch('/csvjson.json');
      const jsonData = await response.json();
      return jsonData
    }
  
    function processData(data, masterList) {
      return new Promise((resolve) => {
        const worker = new Worker('/worker.js');
        
        worker.postMessage({ data: uniq_id, toxicList: masterList });
  
        worker.onmessage = function(e) {
          const { toxic_ingredients: toxic_drug, toxic_id: toxicID, safe_id: safeID, toxicIndexMap: toxicmap } = e.data;
          toxic = toxic_drug;
          toxic_id = toxicID;
          toxicIndexMap = toxicmap;
  
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
  
        const margin2 = 110;
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
        
  
        function drawLine(startX, startY, endX, endY, width) {
          ctx.beginPath();
          ctx.lineWidth = width;
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        function writeLeftAlignedText(text, x, y, size, color = 'black') {
          ctx.font = `${size}px Arial`;
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.fillText(text, x, y);
        }
        function writeRightAlignedText(text, x, y, size, color = 'black') {
          ctx.font = `${size}px Arial`;
          ctx.fillStyle = color;
          ctx.textAlign = 'right';
          ctx.fillText(text, x, y);
        }
  
        function writeDrugNames() {
          ctx.fillStyle = "black";
          ctx.font = "12px Arial";
          ctx.textAlign = 'center';
          for (let i = 0; i < toxic.length; i++) {
            const y = toxic_start + i * (boxHeight + spacingY) + 10;
            writeRightAlignedText(toxic[i], margin2-5, y, 12);
          }
          for (let i = 0; i < safe.length; i++) {
            const y = safe_start + i * (boxHeight + spacingY) + 10;
            writeRightAlignedText(safe[i], margin2-5, y, 12);
          }
          for (let i = 0; i < ICI.length; i++) {
            const y = ICI_start + i * (boxHeight + spacingY) + 10;
            writeRightAlignedText(ICI[i], margin2-5, y, 12);
          }
        }
  
        function drawGridLines(margin2, day, boxWidth, spacingX) {
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.fillStyle = "black";
          ctx.font = "12px Arial";
  
          for (let col = 1; col <= day; col++) {
            if (col % 10 === 0) {
              const x = margin2 + col * (boxWidth + spacingX);
              drawLine(x, toxic_start, x, safe_end+10, 1);
              if (col > 0) {
                ctx.fillText(col, x+5, safe_end + 25); // 눈금을 x 좌표에 맞춰 표시
              }
            }
          }
        }
  
        function drawGrid() {
          ctx.fillStyle = "gainsboro";
          const drawRows = (startY, rowCount, width, height) => {
              for (let row = 0; row < rowCount; row++) {
                  for (let col = 0; col < day; col++) {
                      const x = margin2 + col * (width + spacingX);
                      const y = startY + row * (height + spacingY);
                      ctx.fillRect(x, y, width, height);
                  }
              }
          };
          drawRows(grade_start, 1, boxWidth, gradeHeight); // grade
          drawRows(ICI_start, ICI.length, boxWidth, boxHeight);
          drawRows(ratio_start, 1, boxWidth, 50);
          drawRows(safe_start, safe.length, boxWidth, boxHeight); // safe 섹션
          drawRows(toxic_start, toxic.length, boxWidth, boxHeight); // toxic 섹션
        }
  
        function colorToxic() {
            const boxes = []; // 박스 정보를 저장할 배열
  
            for (let i = 0; i < drug_concept_id.length; i++) {
                const drug_id = drug_concept_id[i];
                const toxicIndex = toxicIndexMap.get(drug_id);
                const dateIndex = days[i]; // 날짜 인덱스 (1-based)
  
                if (toxic_id.includes(drug_id)) {
                    toxic_num[dateIndex - 1]++;
                    const x = margin2 + (dateIndex - 1) * (boxWidth + spacingX);
                    const y = toxic_start + toxicIndex * (boxHeight + spacingY);
                    ctx.fillStyle = "#1E88E5";
                    ctx.fillRect(x, y, boxWidth, boxHeight);
  
                    // 박스 정보를 저장
                    boxes.push({
                        x: x,
                        y: y,
                        width: boxWidth,
                        height: boxHeight,
                        drug_id: drug_id, // 박스에 관련된 데이터 저장
                    });
                }
            }
  
            console.log("Toxic count per day:", toxic_num);
  
            // 캔버스에 마우스 이벤트 추가
            canvas.addEventListener("mousemove", function (e) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
  
                // 캔버스 초기화
                ctx.clearRect(0, 0, canvas.width, canvas.height);
  
                // 모든 박스를 다시 그리기
                for (const box of boxes) {
                    ctx.fillStyle = "#1E88E5";
                    ctx.fillRect(box.x, box.y, box.width, box.height);
                }
  
                // 박스 위에 마우스가 있으면 텍스트 표시
                for (const box of boxes) {
                    if (
                        mouseX >= box.x &&
                        mouseX <= box.x + box.width &&
                        mouseY >= box.y &&
                        mouseY <= box.y + box.height
                    ) {
                        // 박스 위에 텍스트 그리기
                        ctx.fillStyle = "black";
                        ctx.font = "12px Arial";
                        ctx.fillText(
                            `Drug ID: ${box.drug_id}`,
                            box.x,
                            box.y - 5 // 박스 위에 텍스트 출력
                        );
                    }
                }
            });
        }
  
  
        function colorSafe() {
            const safeBoxes = []; // 박스 정보 저장
  
            for (let i = 0; i < drug_concept_id.length; i++) {
                const drugName = drug_name[i].toLowerCase();
                const dateIndex = days[i]; // 날짜 인덱스 (1-based)
  
                if (safe.includes(drugName)) {
                  safe_num[dateIndex - 1]++; // 날짜별 안전 약물 갯수 증가
  
                    const x = margin2 + (dateIndex - 1) * (boxWidth + spacingX);
                    const y = safe_start + safe.indexOf(drugName) * (boxHeight + spacingY);
  
                    ctx.fillStyle = "#4CAF50"; // 초록색으로 박스 채우기
                    ctx.fillRect(x, y, boxWidth, boxHeight);
  
                    // 박스 정보 저장
                    safeBoxes.push({
                        x: x,
                        y: y,
                        width: boxWidth,
                        height: boxHeight,
                        drugName: drugName, // 약물 이름 저장
                        dateIndex: dateIndex // 날짜 인덱스 저장
                    });
                }
            }
  
            console.log("Safe drug count per day:", safe_num);
  
            // 캔버스에 마우스 이벤트 추가
            canvas.addEventListener("mousemove", function (e) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
  
                // 캔버스 초기화
                ctx.clearRect(0, 0, canvas.width, canvas.height);
  
                // 모든 박스를 다시 그리기
                for (const box of safeBoxes) {
                    ctx.fillStyle = "#4CAF50";
                    ctx.fillRect(box.x, box.y, box.width, box.height);
                }
  
                // 박스 위에 마우스가 있으면 텍스트 표시
                for (const box of safeBoxes) {
                    if (
                        mouseX >= box.x &&
                        mouseX <= box.x + box.width &&
                        mouseY >= box.y &&
                        mouseY <= box.y + box.height
                    ) {
                        // 박스 위에 텍스트 그리기
                        ctx.fillStyle = "black";
                        ctx.font = "12px Arial";
                        ctx.fillText(
                            `Drug: ${box.drugName}, Date: ${box.dateIndex}`,
                            box.x,
                            box.y - 5 // 박스 위에 텍스트 출력
                        );
                    }
                }
            });
        }
  
        colorToxic();
        // colorSafe();
  
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
  const newWidth = 33 + day * (boxWidth + spacingX) +  150;
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

<canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas>