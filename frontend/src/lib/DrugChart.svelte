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
  const listICIs = ['Atezolizumab', 'Durvalumab', 'Ipilimumab', 'Nivolumab', 'Pembrolizumab']

  

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

      function drawLine(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 1;
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
      function drawRoundRect(startX, startY, width, height, color, radius = 3) {
        ctx.beginPath();
        ctx.moveTo(startX + radius, startY);
        ctx.arcTo(startX + width, startY, startX + width, startY + height, radius);
        ctx.arcTo(startX + width, startY + height, startX, startY + height, radius);
        ctx.arcTo(startX, startY + height, startX, startY, radius);
        ctx.arcTo(startX, startY, startX + width, startY, radius);
        ctx.fillStyle = color;
        ctx.fill();
      }

      function drawGrayRectangle(startX, startY, width, height) {
        ctx.beginPath();
        ctx.rect(startX, startY, width, height);
        ctx.fillStyle = 'silver';
        ctx.fill();
      }


      function writeRotatedText(text, x, y, angle = -Math.PI / 2, size = 20, color = 'black') {
        ctx.save();
        ctx.font = `${size}px Arial`;
        ctx.fillStyle = color;
        ctx.translate(x, y);
        ctx.rotate(angle); // 반시계 방향으로 90도 회전
        ctx.textAlign = 'left';
        ctx.fillText(text, 0, 0); // 회전된 상태에서 텍스트를 그리기 때문에, 좌표는 0, 0
        ctx.restore();
      }

      function drawImage(img, x, y) {
        const image = new Image();
          image.src = img;
          image.onload = function() {
            ctx.drawImage(image, x, y, 60, 30);
        };
      }

      function iciList(){
        const linespace = 17;
        listICIs.forEach((ici, index) => {
          writeLeftAlignedText(ici, marginX+115, marginY+535 + (index * linespace), 12);
        });
        
      }


      const marginY = 50;
      const marginX = 20;
      const endX = canvas.width - marginX;
      const endY = canvas.height - marginY;      


      writeLeftAlignedText('patient number: ' + selectedPatient, marginX, 25, 13);
      
      drawRoundRect(marginX, 45, 23, 6, 'blue');
      writeLeftAlignedText('Hepatotoxic Drugs(Ref: LiverTox)', marginX + 28, 50, 12, 'black');
      drawRoundRect(marginX+220, 45, 23, 6, 'black');
      writeLeftAlignedText('Non-hepatotoxic drug', marginX + 248, 50, 12, 'black');

      writeRightAlignedText('Other Drug', marginX+90, 100, 15, 'black');
      drawGrayRectangle(marginX+100, 85, 3, 460);
      writeRightAlignedText('ICIs', marginX+90, marginY+540, 15, 'black');
      drawGrayRectangle(marginX+100, marginY+520, 3, 90); 
      writeRightAlignedText('Hepatotoxicity', marginX+90, marginY+650, 15, 'black');
      drawGrayRectangle(marginX+100, marginY+635, 3, 35); 



      iciList();
      
  

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

<canvas bind:this={canvas} width="1600" height="800" style="border:1px solid #000000; width: 100%;"></canvas>


