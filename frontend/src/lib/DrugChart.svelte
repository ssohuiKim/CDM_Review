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
    console.log("Calculated day:", day, typeof day);

    drug_concept_id = data.map(row => row.drug_concept_id || 0);
    uniq_id = Array.from(new Set(drug_concept_id));  
    drug_name = data.map(row => row.drug_name || 0);
    ICI_lasting = data.map(row => row.ICI_lasting || 0);
    measurement_date = data.map(row => row.measurement_date || 0);
    grade = data.map(row => row.grade || "-1");
    console.log("grade:", grade);
    
    
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
        // console.log(toxicIndexMap);

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

      function draw_toxic() {
        ctx.fillStyle = "lightblue";
        for (let row = 0; row < toxic.length; row++) {
          for (let col = 0; col < day; col++) {
              const x = margin + col * (boxWidth + spacingX);
              const y = toxic_start + row * (boxHeight + spacingY);
              ctx.fillRect(x, y, boxWidth, boxHeight);
          }
        }
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
        const colors = {"0": "#ffcccc", "1": "#ff9999", "2": "#ff6666", "3": "#ff3333", "4": "#ff0000", "-1": "grey"};

        for (let i = 0; i < grade.length; i++) {
          const gradeValue = grade[i]; // grade 배열에서 현재 값 가져오기
          const dateIndex = days[i]; // days에서 동일한 인덱스의 값 가져오기

          // x 좌표 계산 (박스 위치)
          const x = margin + (dateIndex - 1) * (boxWidth + spacingX);

          if (colors.hasOwnProperty(gradeValue)) {
            // gradeValue가 0~4에 해당하면 색상 적용
            ctx.fillStyle = colors[gradeValue];
          } else {
            // 값이 없거나 매칭되지 않는 경우 회색
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