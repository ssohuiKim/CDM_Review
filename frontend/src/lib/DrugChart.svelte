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
      lastDate;
      

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
    day_num = Array.from(new Set(data.map(row => row.day_num || 0)));
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
    grade = data.map(row => row.grade || 0);
    
    
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

        grade = data.map(row => row.grade).filter(Boolean);
        resolve();
      };
    });
  }


  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const startX = 0;
      const endX = canvas.width;
      const startY = 0;
      const endY = canvas.height;
      const margin = 33;

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

      function Grid(day, toxic, startX, startY, spacingX = 2, spacingY = 4, boxWidth = 5, boxHeight = 14) {
        ctx.fillStyle = 'lightgray';
        for (let row = 0; row < toxic.length; row++) { // 세로 방향: toxic.length만큼 반복
          for (let col = 0; col < day; col++) { // 가로 방향: day만큼 반복
              const x = startX + col * (boxWidth + spacingX); // 가로 위치 계산
              const y = startY + row * (boxHeight + spacingY); // 세로 위치 계산
              ctx.fillRect(x, y, boxWidth, boxHeight); // 네모 그리기
          }
        }
      }
      
      // drawLine(startX, 25, endX, 25);
      writeLeftAlignedText('Patient number: ' + selectedPatient, margin + 10, 20);
      writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);
      Grid(day, toxic, 50, 50);






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