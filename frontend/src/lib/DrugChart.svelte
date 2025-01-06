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


      function colorGrade() {
        const colors = {"0": "#FEE3D6", "1": "#FCBEA5", "2": "#FC9575", "3": "#EF3B2C", "4": "#CA171C"};
        for (let i=0; i<grade.length; i++) {
          const gradeValue = grade[i];
          const dateIndex = days[i];

          const x = margin2 + (dateIndex) * (boxWidth + spacingX);
          if (colors.hasOwnProperty(gradeValue)) {
            ctx.fillStyle = colors[gradeValue];
            ctx.fillRect(x, grade_start, boxWidth, gradeHeight);
          }
        }
      }

      function colorToxic() {
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
            }
        }
      }

      function colorSafe() {
        for (let i=0; i<drug_concept_id.length; i++) {
          const drugName = drug_name[i].toLowerCase();
          const dateIndex = days[i];
          if (safe.includes(drugName)) {
            safe_num[dateIndex - 1]++;
            const x = margin2 + (dateIndex - 1) * (boxWidth + spacingX);
            const y = safe_start + safe.indexOf(drugName) * (boxHeight + spacingY);
            ctx.fillStyle = "#4CAF50";
            ctx.fillRect(x, y, boxWidth, boxHeight);
          }
        }        
      }

      function colorICI() {
        for (let i = 0; i < ICI_lasting.length; i++) {
            const dateIndex = new_drug_exposure_date[i];
            const duration = ICI_lasting[i];
            const ICI_drug = drug_name[i];

            if (duration != 0) {
                const durationDate = new Date(duration);
                const dateIndexDate = new Date(dateIndex);
                const index = ICI.findIndex(drug => drug.toLowerCase() === ICI_drug.toLowerCase());
                let drug_duration = Math.ceil((durationDate - dateIndexDate) / (1000 * 60 * 60 * 24)) + 1;

                // 시작 박스의 x, y 좌표
                const x = margin2 + (days[i] - 1) * (boxWidth + spacingX);
                const y = ICI_start + index * (boxHeight + spacingY);

                // 시작 부분 박스 (전체 높이)
                ctx.fillStyle = "#FFC107";
                ctx.fillRect(x, y, boxWidth, boxHeight); // 시작 부분만 전체 높이

                // 나머지 지속 기간 박스 (짧게)
                const shortHeight = boxHeight / 2; // 나머지 박스 높이를 줄임
                const shortY = y + (boxHeight - shortHeight) / 2; // 중간에 위치하도록 조정
                ctx.fillRect(
                    x + boxWidth, // 시작 박스의 바로 오른쪽부터
                    shortY,
                    (drug_duration - 1) * (boxWidth + spacingX), // 나머지 지속 기간 길이
                    shortHeight
                );
            }
        }
      }

      function colorRatio() {
        // toxic_num, safe_num의 비율을 계산하여 표시
        for (let i = 0; i < day; i++) {
          const total = toxic_num[i] + safe_num[i];
          // 0이 아니라면 safe와 toxic의 비율을 합 1로 나타내기
          const ratio_safe = total === 0 ? 0 : safe_num[i] / total;
          const safe_x = margin2 + i * (boxWidth + spacingX);
          const safe_y = ratio_start + 50 - ratio_safe * 50;
          ctx.fillStyle = "#4CAF50";
          ctx.fillRect(safe_x, safe_y, boxWidth, ratio_safe * 50);

          

          const ratio_tox = total === 0 ? 0 : toxic_num[i] / total;
          const tox_x = margin2 + i * (boxWidth + spacingX);
          const tox_y = ratio_start;
          ctx.fillStyle = "#1E88E5";
          ctx.fillRect(tox_x, tox_y, boxWidth, ratio_tox * 50);
         }
      }



      writeLeftAlignedText('Patient number: ' + selectedPatient, margin1 + 10, 20, 12);
      writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin1 + 10, 35, 12);
      // ICI ratio 선 표시
      drawLine(margin2-10, ratio_start, margin2-10, ratio_start+50, 2.3);
      drawLine(margin2-10, ratio_start+1, margin2-22, ratio_start+1, 2.3);
      drawLine(margin2-10, ratio_start+24, margin2-22, ratio_start+24, 2.3);
      drawLine(margin2-10, ratio_start+49, margin2-22, ratio_start+49, 2.3);
      writeRightAlignedText('0', margin2-30, ratio_start+4, 12);
      writeRightAlignedText('0.5', margin2-30, ratio_start+27, 12);
      writeRightAlignedText('1', margin2-30, ratio_start+52, 12);
      // 순서 중요!!
      drawGrid();
      colorGrade();
      writeDrugNames();
      colorToxic();
      colorSafe();
      colorICI();
      colorRatio();


      drawGridLines(margin2, day, boxWidth, spacingX);

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

<canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas>