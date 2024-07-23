<script>
  import { onMount } from 'svelte';
  import dateFormat from 'dateformat';

  export let type; // "row" or "col"
  export let selectedPatient;
  export let patientData;

  let takenDrugs = [];
  let drugExposureDates = [];
  let measurements = [];
  let uniqueDates = [];
  let formattedDates = [];
  let drugs = [];
  let toxic = [];
  let safe = [];
  let drugAll = [];
  let isDataInitialized = false;

  const idToDrugMap = {
    42920398: 'atezolizumab',
    1594046: 'durvalumab',
    1594038: 'durvalumab',
    46275962: 'ipilimumab',
    42920744: 'nivolumab',
    42922127: 'nivolumab',
    42921578: 'pembrolizumab'
  };

  function formatDate(dateString, isFirstDate = false) {
    let d = new Date(dateString);
    return isFirstDate ? dateFormat(d, "yy.mm.dd") : dateFormat(d, "mm.dd");
  }

  async function fetchMasterList() {
    const response = await fetch('/toxicdrugs.json');
    const jsonData = await response.json();
    return jsonData.map(entry => entry.trim().toLowerCase());
  }

  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];

      measurements = data.map(row => row.measurement_date || 0);

      drugExposureDates = data.map(row => row.drug_exposure_start_date || row.measurement_date).filter(Boolean);
      uniqueDates = Array.from(new Set(drugExposureDates));
      formattedDates = uniqueDates.map((date, index) => formatDate(date, index === 0));

      drugs = Array.from(new Set(data.map(row => row.drug_concept_id).filter(id => idToDrugMap[id]).map(id => idToDrugMap[id])));

      takenDrugs = data.map(row => row.drug_name).filter(Boolean).map(drug => drug.toLowerCase());
      takenDrugs = takenDrugs.map(drug => {
        if (drug === 'l-ornithine-l-') {
          return 'LOLA*';
        } else if (drug === 'medium chain t') {
          return 'MCTs*';
        } else {
          return drug;
        }
      });

      drugAll = Array.from(new Set(takenDrugs)).filter(name => !drugs.includes(name));
      const masterList = await fetchMasterList();

      return { data, masterList };
    }
    return null;
  }

  function processData(data, masterList) {
    return new Promise((resolve) => {
      const worker = new Worker('/worker.js');
      worker.postMessage({ data: drugAll, toxicList: masterList });
      worker.onmessage = function(e) {
        const { toxic: toxicDrugs, safe: safeDrugs } = e.data;
        toxic = Array.from(new Set(toxicDrugs));
        safe = Array.from(new Set(safeDrugs));
        resolve();
      };
    });
  }

  let canvas;

  $: if (isDataInitialized) {
    adjustCanvasSize();
    drawAxis();
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

  function drawAxis() {
    if (isDataInitialized) {
      if (type === 'row') {
        drawBottomAxis();
      } else if (type === 'col') {
        drawLeftAxis();
      }
    }
  }

  function drawBottomAxis() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      let dates = formattedDates;
      ctx.strokeStyle = 'black';
      let linespacing = 17;

      // 필요한 함수 정의
      function writeRightAlignedText(text, x, y, size = 15, color = 'black') {
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(text, x, y);
      }

      // 날짜 적기
      formattedDates.forEach((date, index) => {
        const x = (index + 1) * 45;
        ctx.rotate(-Math.PI / 4.5);
        ctx.fillText(date, x+150, canvas.height - 5);
      });
    }
  }


  function drawLeftAxis() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(1, canvas.height);
      ctx.strokeStyle = '#000';
      ctx.stroke();

      const margin = 33;
      const startX = margin;
      const startY = 0;
      const verticalX1 = startX + 160;
      const linespacing = 17;
      
      let newLineY = startY + 32 + (drugs.length * linespacing);
      let safeStartY = newLineY + (toxic.length * linespacing);
      let safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);
      function drawLine(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      function writeRightAlignedText(text, x, y, size = 15, color = 'black') {
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(text, x, y);
      }
      function ICI() {
        for (let i = 0; i < drugs.length; i++) {
          writeRightAlignedText(drugs[i], startX + 153, startY + 42 + (i * linespacing), 15, 'blue');
        }
      }
      function writeDrugName() {
        let startToxicY = newLineY + linespacing;
        let safeWriteEndY = safeEndY + linespacing;
        drawLine(verticalX1, startY, verticalX1, safeWriteEndY);
        
        for (let i = 0; i < toxic.length; i++) {
          writeRightAlignedText(toxic[i], startX + 153, startToxicY + (i * linespacing), 15, 'blue');
        }
        let safeWriteStartY = safeStartY + linespacing;
        for (let i = 0; i < safe.length; i++) {
          writeRightAlignedText(safe[i], startX + 153, safeWriteStartY + (i * linespacing), 15);
        }
      }

      // Draw labels
      writeRightAlignedText('hepatotoxicity', startX + 153, startY + 17, 15, 'red'); 
      ICI();
      writeDrugName();

    }
  }
    
  function adjustCanvasWidth() {
    const datespace = 45; // Set date space to 45
    const newWidth = formattedDates.length * datespace+15; // Minimum width plus calculated width
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
  }

  function adjustCanvasHeight(){
    const linespacing = 17;
    const margin = 33;
    const newLineY = margin + 32 + (drugs.length * linespacing);
    const safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);
    const newHeight = safeEndY;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }
  function adjustCanvasSize() {
    if (type === 'row') {
      adjustCanvasWidth();
      canvas.height = 35;
      canvas.style.height = '35px';
    } else {
      canvas.width = 200;
      canvas.style.width = '200px';
      adjustCanvasHeight();
    }
  }

</script>

<canvas bind:this={canvas}></canvas>


<style>
  canvas {
    pointer-events: none;
  }
</style>
