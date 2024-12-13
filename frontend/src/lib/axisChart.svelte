<!-- <script>
  import { onMount } from 'svelte';
  import dateFormat from 'dateformat'; 

  export let selectedPatient;
  export let patientData;

  let takenDrugs = [];
  let drugExposureDates = [];
  let measurements = [];
  let hepatotoxicityGrade = [];
  let toxic_id = [];
  let toxicIndexMap = new Map();

  let toxic = [];
  let safe = [];
  let uniqueDates = [];
  let formattedDates = [];
  let drugs = [];
  let drugAll = [];
  let drug_concept_id = [];
  let isDataInitialized = false;
  let test = [];
  let drug_id_unique = [];
  let all_drugs = [];

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
    const response = await fetch('/csvjson.json');
    const jsonData = await response.json();
    return jsonData
      // .map(entry => entry.trim().toLowerCase());
  }

  async function initializeData() {
  if (selectedPatient && patientData[selectedPatient]) {
    const data = patientData[selectedPatient];
    test = new Set(data.map(row => row.new_drug_exposure_date));

    // console.log('test', test);
    measurements = data.map(row => row.measurement_date || 0); // 결측치 0으로 채우기

    drugExposureDates = data.map(row => row.new_drug_exposure_start_date || row.measurement_date).filter(Boolean);
    // uniqueDates = Array.from(new Set(drugExposureDates));
    uniqueDates = Array.from(new Set(data.map(row => row.new_drug_exposure_date || row.measurement_date)));
    console.log(uniqueDates);
    console.log("uniqueDates:", uniqueDates, typeof uniqueDates);
 
    formattedDates = uniqueDates.map((date, index) => formatDate(date, index === 0));
    
    drugs = Array.from(new Set(data.map(row => row.drug_concept_id).filter(id => idToDrugMap[id]).map(id => idToDrugMap[id])));  // ICI
    
    all_drugs = Array.from(data.map(row => row.drug_name || 0));  // name 전부 공백 0으로 채우기

    drug_concept_id = Array.from(data.map(row => row.drug_concept_id || 0));  // id 전부, 공백 0으로 채우기

    drug_id_unique = Array.from(new Set(drug_concept_id));  // id 중복 제거

    // takenDrugs = data.map(row => row.drug_name).filter(Boolean);
    // takenDrugs = takenDrugs.map(drug => drug.toLowerCase());
    takenDrugs = all_drugs.map(drug => (drug !== 0 ? drug.toLowerCase() : drug));
    console.log(all_drugs.length);
    console.log(takenDrugs.length);

    drugAll = Array.from(new Set(takenDrugs)).filter(name => !drugs.includes(name));
    const masterList = await fetchMasterList();

    return { data, masterList };
  }
  return null;
}

function processData(data, masterList) {
  return new Promise((resolve) => {
    const worker = new Worker('/worker.js');
    
    worker.postMessage({ data: drug_id_unique, toxicList: masterList });

    worker.onmessage = function(e) {
      const { toxic_ingredients: toxic_drug, toxic_id: toxicID, safe_id: safeID, toxicIndexMap: toxicmap } = e.data;
      toxic = toxic_drug;
      toxic_id = toxicID;
      toxicIndexMap = toxicmap;
      console.log(toxicIndexMap);

      safe = safeID.map(safeDrug => {
        const index = drug_concept_id.indexOf(safeDrug);
        return all_drugs[index];
      });

      // 0제거, 중복제거
      safe = [...new Set(safe.filter(drug => drug !== 0))];
      safe = safe.map(drug => drug.toLowerCase());

      hepatotoxicityGrade = data.map(row => row.grade).filter(Boolean);
      resolve();
    };
  });
}


  import BlackDia from '../img/BlackDia.png';
  import BlueDia from '../img/BlueDia.png';
  import Nan from '../img/Nan.png';
  import Grade1 from '../img/Grade1.png';
  import Grade2 from '../img/Grade2.png';
  import Grade3 from '../img/Grade3.png';
  import DateRed from '../img/DateRed.png';
  import OrangeDia from '../img/OrangeDia.png';

  // const getToxicIndex = (name) => toxic_id.indexOf(name) + 1;
  const getToxicIndex = (cdm_id) => toxicIndexMap.get(cdm_id) || -1;
  const getSafeIndex = (name) => safe.indexOf(name) + 1;
  const getDateIndex = (date) => uniqueDates.indexOf(date) + 1;
  const getDateOriginalIndex = (date) => drugExposureDates.indexOf(date) + 1;
  const getDrugIndex = (drug) => drugs.indexOf(drug) + 1;
  const getSafeName = (ID) => safe.indexOf(ID) + 1;

  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");

      const margin = 33;     // 가장자리 사이 여백
      const moveDown = 15;
      const startX = margin;
      const endX = canvas.width - margin;
      const startY = margin + moveDown;
      const endY = 1000 - margin + moveDown;
      const y = startY + 25;
      const verticalX1 = startX + 160;
      const verticalX2 = endX - 160;
      const linespacing = 17;
      const datespace = 35;

      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing

      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      let dates = formattedDates;

      let newLineY = startY + 32 + (drugs.length * linespacing);
      let safeStartY = newLineY + (toxic.length * linespacing);
      let safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);

      function drawRectangle(startX, startY, endX, endY) {  // 차트 테두리
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.stroke();
      }
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
      function writeRightAlignedText(text, x, y, size = 15, color = 'black') {
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(text, x, y);
      }
      function ICI() {
        drawLine(startX, newLineY, endX, newLineY);
        for (let i = 0; i < drugs.length; i++) {
          writeRightAlignedText(drugs[i], startX + 153, startY + 42 + (i * linespacing), 15, 'blue');
          writeLeftAlignedText(drugs[i], endX - 153, startY + 42 + (i * linespacing), 15, 'blue');
        }
      }       

      function writeDrugName() {
        let startToxicY = newLineY + linespacing;
        let safeWriteEndY = safeEndY + linespacing;
        drawRectangle(margin, margin + moveDown, canvas.width - margin, safeWriteEndY + linespacing * 3 + 15);
        drawLine(verticalX1, startY, verticalX1, safeWriteEndY);
        drawLine(verticalX2, startY, verticalX2, safeWriteEndY);
        drawLine(verticalX1, safeWriteEndY, verticalX2, safeWriteEndY);
        
        for (let i = 0; i < toxic.length; i++) {
          writeRightAlignedText(toxic[i], startX + 153, startToxicY + (i * linespacing), 15, 'blue');
          writeLeftAlignedText(toxic[i], endX - 153, startToxicY + (i * linespacing), 15, 'blue');
        }

        let safeWriteStartY = safeStartY + linespacing;
        for (let i = 0; i < safe.length; i++) {
          writeRightAlignedText(safe[i], startX + 153, safeWriteStartY + (i * linespacing), 15);
          writeLeftAlignedText(safe[i], endX - 153, safeWriteStartY + (i * linespacing), 15);
        }
        // if (safe.includes('LOLA*') || safe.includes('MCTs')) {
        //   writeLeftAlignedText('LOLA* : L-ornithine L-aspartate; MCTs : Medium Chain Triglycerides', margin + 8, safeWriteEndY + linespacing * 3 + 8, 12);
        // }
      }

      function writeDate() {
        for (let i = 0; i < dates.length; i++) {
          ctx.save();
          ctx.translate(verticalX1 + datespace + (i * datespace), safeEndY + linespacing + 15);
          ctx.rotate(-Math.PI / 6);
          writeRightAlignedText(dates[i], 0, 0, 13);
          ctx.restore();
        }
      }
      
      function drawToxic() {
        let drugIndex, dateIndex;
        for (let i = 0; i < drug_concept_id.length; i++) {
          if (toxic_id.includes(drug_concept_id[i])) {
            drugIndex = getToxicIndex(drug_concept_id[i]);
            dateIndex = getDateIndex(drugExposureDates[i]);
            drawBlueDia(dateIndex, drugIndex);
          }
        }
      }

      function drawSafe() {
        let drugIndex, dateIndex;
        for (let i = 0; i < takenDrugs.length; i++) {
          if (safe.includes(takenDrugs[i])) { // Check if takenDrug is safe
            drugIndex = getSafeIndex(takenDrugs[i]);
            dateIndex = getDateIndex(drugExposureDates[i]);
            if (takenDrugs[i] === "bevacizumab") {
              console.log(drugExposureDates[i]);
            }
            drawBlackDia(dateIndex, drugIndex);
          }
        }
      }

      function drawBlueDia(datesIndex, toxicIndex) {    
        const linespaceX = datespace;
        const linespaceY = (safeStartY - newLineY) / toxic.length;
        const x = verticalX1 + linespaceX * (datesIndex - 0.3);
        const y = newLineY + linespaceY * (toxicIndex - 0.3);
        
        const image = new Image();
        image.src = BlueDia;
        image.onload = function() {
          ctx.drawImage(image, x - 10, y - 5, 10, 10);
        };
      }

      function drawBlackDia(datesIndex, safeIndex) {    
        const linespaceX = datespace;
        const linespaceY = (safeEndY - safeStartY) / safe.length;
        const x = verticalX1 + linespaceX * (datesIndex - 0.3);
        const y = safeStartY + linespaceY * (safeIndex - 0.3);

        const image = new Image();
        image.src = BlackDia;
        image.onload = function() {
          ctx.drawImage(image, x - 10, y - 5, 10, 10);
        };
      }

      function drawGrade(dateIndex, grade) {
        const linespaceX = datespace;
        const x = verticalX1 + linespaceX * (dateIndex - 0.3);
        
        const image = new Image();
        image.onload = function() {
          ctx.drawImage(image, x - 10, startY + 5, 15, 15);
        };
        if (grade === 0) {
          image.src = Nan;
        } else if (grade === 1) {
          image.src = Grade1;
        } else if (grade === 2) {
          image.src = Grade2;
        } else if (grade === 3) {
          image.src = Grade3;
        } else {
          image.src = Grade3;
        }
      }

      function drawOrangeDia(datesIndex, drugsIndex) {
        let startLineY = startY + 25;
        const linespaceX = datespace;
        const linespaceY = (newLineY - startLineY - 10) / drugs.length;                
        const x = verticalX1 + linespaceX * (datesIndex - 0.3);
        const y = startLineY + linespaceY * (drugsIndex - 0.3);

        const image = new Image();
        image.src = OrangeDia;
        image.onload = function() {
          ctx.drawImage(image, x - 11, y - 5, 12, 12);
        };
      }

      function drawICI() {
        let drugIndex, dateIndex;
        for (let i = 0; i < takenDrugs.length; i++) {
          if (drugs.includes(takenDrugs[i])) {
            drugIndex = getDrugIndex(takenDrugs[i]);
            dateIndex = getDateIndex(drugExposureDates[i]);
            drawOrangeDia(dateIndex, drugIndex);
          }
        }
      }

      function drawDateRedShape(datesIndex) {
        const linespaceX = datespace;         
        const x = verticalX1 + linespaceX * (datesIndex - 0.3);
        let safeWriteEndY = safeEndY + linespacing;
        const image = new Image();
        image.src = DateRed;
        image.onload = function() {
          ctx.drawImage(image, x - 10, safeWriteEndY - 6, 13, 13);
        };
      }

      function drawDateGrade() {
        let coordinates = [];
        let dateIndex;
        for (let i = 0; i < measurements.length; i++) {
          if (measurements[i] !== 0) {
            dateIndex = getDateIndex(measurements[i]);
            drawDateRedShape(dateIndex); 
            coordinates.push([dateIndex, hepatotoxicityGrade[i]]);
          }
        }
        coordinates = coordinates.filter((item, index) => {
          return coordinates.findIndex((coord) => coord[0] === item[0] && coord[1] === item[1]) === index;
        });  // Remove duplicates
        coordinates.forEach(coord => {
          let x = coord[0];
          let y = coord[1];
          drawGrade(x, parseInt(y));
        });
      }
      
      drawLine(startX, y, endX, y);
      writeLeftAlignedText('Patient number: ' + selectedPatient, margin + 10, 20);
      writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);
      writeRightAlignedText('hepatotoxicity', startX + 153, startY + 17, 15, 'red'); 
      writeLeftAlignedText('hepatotoxicity', endX - 153, startY + 17, 15, 'red');
      ICI();
      writeDrugName();
      writeDate();
      drawToxic();
      drawSafe();
      drawICI();
      drawDateGrade();
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
    const datespace = 35;
    const newWidth = formattedDates.length * datespace + 400; // Minimum width plus calculated width
    canvas.width = newWidth;
    canvas.style.width = `${newWidth}px`;
  }

  function adjustCanvasHeight() {
    let linespacing = 17;
    let newLineY = 80 + (drugs.length * linespacing);
    let safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);
    const newHeight = safeEndY + linespacing * 4 + 30;
    canvas.height = newHeight;
    canvas.style.height = `${newHeight}px`;
  }

</script>

<canvas bind:this={canvas} style="border:1px solid #000000; width: 100%; height:100%;"></canvas> -->