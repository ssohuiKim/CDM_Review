<script>
  import { onMount } from 'svelte';
  import dateFormat from 'dateformat'; 

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
      uniqueDates=[],
      formattedDates=[],
      toxicIndexMap=new Map(),
      uniq_id=[],
      firstDate,
      lastDate,
      days=[];
      

  const idToDrugMap = {
    42920398: 'atezolizumab',
    1594046: 'durvalumab',
    1594038: 'durvalumab',
    46275962: 'ipilimumab',
    42920744: 'nivolumab',
    42922127: 'nivolumab',
    42921578: 'pembrolizumab'
  };


  async function initializeData() {
  if (selectedPatient && patientData[selectedPatient]) {
    const data = patientData[selectedPatient];

    new_drug_exposure_date = data.map(row => row.new_drug_exposure_date || row.measurement_date);
    days = data.map(row => row.day_num || 0);
    day_num = Array.from(new Set(days));
    // day = day_num[day_num.length - 1]; 
    firstDate = new Date(new_drug_exposure_date[0]);
    lastDate = new Date(new_drug_exposure_date[new_drug_exposure_date.length - 1]);
    day = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    drug_concept_id = data.map(row => row.drug_concept_id || 0);
    uniq_id = Array.from(new Set(drug_concept_id));  
    drug_name = data.map(row => row.drug_name || 0);
    ICI_lasting = data.map(row => row.ICI_lasting || 0);
    measurement_date = data.map(row => row.measurement_date || 0);
    grade = data.map(row => row.grade || "-1");
    
    
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
        safe = [...new Set(safe.filter(drug => drug !== 0))];
        safe = safe.map(drug => drug.toLowerCase());

        resolve();
      };
    });
  }

  const getDateIndex = (date) => grade.indexOf(date) + 1;


  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const margin = 33;
      const spacingX = 2;
      const spacingY = 4;
      const boxWidth = 5;
      const boxHeight = 14;
      const toxic_start = 200;
      const toxic_end = toxic.length*(boxHeight + spacingY) + toxic_start + 20;

      function drawLine(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      function writeLeftAlignedText(text, x, y, size = 15, color = 'black') {
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y);
      }

      function drawGridLines(margin, day, boxWidth, spacingX, toxic_start, height) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";

        for (let col = 0; col <= day; col++) {
          if (col % 10 === 0) {
            const x = margin + col * (boxWidth + spacingX);

            // 세로선 그리기
            ctx.beginPath();
            ctx.moveTo(x, toxic_start); // 위쪽 시작
            ctx.lineTo(x, height); // 아래쪽 끝
            ctx.stroke();

            // 눈금 표시
            if (col > 0) {
              ctx.fillText(col, x - 5, height + 15); // 눈금을 x 좌표에 맞춰 표시
            }
          }
        }
        
      }


      function draw_toxic() {
        ctx.fillStyle = "lightblue";
        for (let row = 0; row < toxic.length; row++) {
          for (let col = 0; col < day; col++) {
              const x = margin + col * (boxWidth + spacingX);
              const y = 120 + row * (boxHeight + spacingY);
              ctx.fillRect(x, y, boxWidth, boxHeight);
          }
        }
        drawGridLines(margin, day, boxWidth, spacingX, 120, 200);
      }

      function draw_safe() {
        ctx.fillStyle = "lightgreen";
        for (let row = 0; row < safe.length; row++) {
          for (let col = 0; col < day; col++) {
              const x = margin + col * (boxWidth + spacingX);
              const y = toxic_end + row * (boxHeight + spacingY);
              ctx.fillRect(x, y, boxWidth, boxHeight);
          }
        }
      }

      function drawGrade() {
        const colors = {"0": "#FEE3D6", "1": "#FCBEA5", "2": "#FC9575", "3": "#EF3B2C", "4": "#CA171C"};

        for (let i = 0; i < grade.length; i++) {
          const gradeValue = grade[i];
          const dateIndex = days[i];

          // x 좌표 계산 (박스 위치)
          const x = margin + (dateIndex - 1) * (boxWidth + spacingX);

          if (colors.hasOwnProperty(gradeValue)) {
            console.log(gradeValue, dateIndex);
            ctx.fillStyle = colors[gradeValue];
          } else {
            ctx.fillStyle = "grey";
          }

          // 박스 그리기
          ctx.fillRect(x, 120, boxWidth, boxHeight);
        }
      }

      // drawLine(startX, 25, endX, 25);
      writeLeftAlignedText('Patient number: ' + selectedPatient, margin + 10, 20);
      writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);
      draw_toxic();
      draw_safe();
      drawGrade();




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
    const datespace = 8;
    const newWidth = day*datespace + 400; // Minimum width plus calculated width
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
  }

  function adjustCanvasHeight() {
    let linespacing = 17;
    let newLineY = 80 + ((toxic.length+safe.length) * linespacing);
    let safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);
    const newHeight = safeEndY + linespacing * 4 + 30;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }

</script>

<canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas>