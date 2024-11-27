<script>
  import { onMount } from 'svelte';
  import {afterUpdate} from 'svelte';
  import dateFormat from 'dateformat'; 

  export let selectedPatient;
  export let patientData;

  // let 
  //   measurement_date = [],
  //   drug_exposure_date = [],
  //   drug_concept_id = [],
  //   ICI_lasting = [],
  //   sum_quantity = [],
  //   grade = [],
  //   drug_name = [];
    
    

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

      function gradeGuide() {
          const images = [nan, grade1, grade2, grade3, grade4];
          const grades = ['Nan', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];

          const spacing = 110; // 이미지 간의 간격

          images.forEach((src, index) => {
              const image = new Image();
              image.onload = function() {
                  ctx.drawImage(image, marginX + (index*spacing), endY+15, 30, 16);
                  writeLeftAlignedText(grades[index], marginX + (index*spacing) + 35, endY+27, 12);
              };
              image.src = src;
          });
      }

      function Grid(boxWidth, boxHeight, columns, rows, startX, startY) {
          const spacingX = 2;
          const spacingY = 4;
          ctx.fillStyle = 'lightgray'; 

          for (let row = 0; row < rows; row++) {
              for (let col = 0; col < columns; col++) {
                  const x = startX + col * (boxWidth + spacingX);
                  const y = startY + row * (boxHeight + spacingY);
                  ctx.fillRect(x, y, boxWidth, boxHeight);
              }
          }
      }




      const marginY = 50;
      const marginX = 20;
      const endX = canvas.width;
      const endY = canvas.height;      


      writeLeftAlignedText('patient number: ' + selectedPatient, marginX, 25, 13);

      // 고정된 부분 (grade표시 및 Drugs 표시)
      writeLeftAlignedText('Hepatotoxicity', marginX, endY-marginY, 12, 'black');

      writeLeftAlignedText('Drugs', marginX, endY-(marginY-25), 12, 'black');
      
      // drawRoundRect(marginX, 45, 25, 6, 'blue');
      // writeLeftAlignedText('Hepatotoxic Drugs(Ref: LiverTox)', marginX + 30, 50, 12, 'black');
      // drawRoundRect(marginX+220, 45, 25, 6, 'black');
      // writeLeftAlignedText('Non-hepatotoxic drug', marginX + 250, 50, 12, 'black');

      // writeRightAlignedText('Other Drug', marginX+90, 100, 15, 'black');
      // drawGrayRectangle(marginX+100, 85, 3, 460);
      // writeRightAlignedText('ICIs', marginX+90, marginY+535, 15, 'black');
      // drawGrayRectangle(marginX+100, marginY+520, 3, 90); 
      // iciList();
      // writeRightAlignedText('Hepatotoxicity', marginX+90, marginY+650, 15, 'black');
      // drawGrayRectangle(marginX+100, marginY+635, 3, 35); 

      // gradeGuide();

      // Grid(22, 13, 50, 5, marginX+205, marginY+525);
      // Grid(22*10 + 2*9, 20, 5, 20, marginX+205, 85);
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


