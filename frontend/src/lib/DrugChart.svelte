<script>
  import { onMount } from 'svelte';
  import {afterUpdate} from 'svelte';
  import dateFormat from 'dateformat'; 

  export let selectedPatient;
  export let patientData;


  let drug_exposure_date = [];
  let drug_concept_id = [];
  let drug_name = [];
  let ICI = [];
  let ICI_lasting = [];
  let sum_quantity = [];
  let measurement_date = [];
  let grade = [];


  let toxic = [];
  let safe = [];

  const idToDrugMap = {
    42920398: 'atezolizumab',
    1594046: 'durvalumab',
    1594038: 'durvalumab',
    46275962: 'ipilimumab',
    42920744: 'nivolumab',
    42922127: 'nivolumab',
    42921578: 'pembrolizumab'
  };

  import nan from '../img/nan.png';
  import grade1 from '../img/grade1.png';
  import grade2 from '../img/grade2.png';
  import grade3 from '../img/grade3.png';
  import grade4 from '../img/grade4.png';


  function formatDate(dateString, isFirstDate = false) {
    let d = new Date(dateString);
    return isFirstDate ? dateFormat(d, "yy.mm.dd") : dateFormat(d, "mm.dd");
  }

  async function fetchMasterList() {
    const response = await fetch('/toxicDrugs.json');
    const jsonData = await response.json();
    return jsonData
      .map(entry => entry.trim().toLowerCase());
  }

  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];

      measurement_date = data.map(row => row.measurement_date || 0); // 결측치 0으로 채우기

      drug_exposure_date = data.map(row => row.drug_exposure_start_date || row.measurement_date).filter(Boolean);

      ICI = Array.from(new Set(data.map(row => row.drug_concept_id).filter(id => idToDrugMap[id]).map(id => idToDrugMap[id])));
      drug_concept_id = data.map(row => row.drug_concept_id).filter(Boolean);
      ICI_lasting = data.map(row => row.ICI_lasting).filter(Boolean);
      sum_quantity = data.map(row => row.sum_quantity).filter(Boolean);
      grade = data.map(row => row.grade).filter(Boolean);


      drug_name = data.map(row => row.drug_name).filter(Boolean);
      drug_name = drug_name.map(drug => drug.toLowerCase());
      drug_name = drug_name.map(drug => {
        if (drug === 'l-ornithine-l-') {
          return 'LOLA*';
        } else if (drug === 'medium chain t') {
          return 'MCTs*';
        } else {
          return drug;
        }
      });
    }
    return null;
  }


  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      function drawRectangle(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.stroke();
      }
      function drawLine(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      function writeLeftAlignedText(text, x, y, size = 15, color = 'black') {
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y);
      }
      function writeRotatedText(text, x, y, size = 20, color = 'black') {
        ctx.save();
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.translate(x, y);
        ctx.rotate(-Math.PI/2); // 반시계 방향으로 90도 회전
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y);
        ctx.restore();
      }
      function drawImage(img, x, y) {
        const image = new Image();
          image.src = img;
          image.onload = function() {
            ctx.drawImage(image, x, y, 60, 30);
        };
      }


      const marginY = 50;
      const marginX = 20;
      const endX = canvas.width - marginX;
      const endY = canvas.height - marginY;
      
      



      writeLeftAlignedText('Patient number: ' + selectedPatient, marginX, marginY);
      drawRectangle(marginX, marginY + 20, endX, endY);
      writeRotatedText('Other drug', marginX-90, marginY+160);
      writeRotatedText('ICIs', marginX-180, marginY+250);  // 같은 수 만큼 x에서 빼고 y에서 더해줘야함
      
  

    }
  }

  let canvas;

  onMount(() => {
    initializeData();
    draw();
  });

  afterUpdate(() => {
    initializeData();
    draw();
  });

</script>

<canvas bind:this={canvas} width="1600" height="750" style="border:1px solid #000000; width: 100%;"></canvas>


