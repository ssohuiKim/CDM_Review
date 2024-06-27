<script>
    import { onMount } from 'svelte';
    import {drugConceptIds, drugNames, drugExposureStartDates, measurementDates, grades} from '$lib/stores';
    let takenDrugs = [];
    let drugExposureDates = [];
    let measurements = [];
    let hepatoxicityGrades = [];

    let toxic = [];
    let safe = [];
    let uniqueDates = [];
    let formattedDates = [];
    let drugs = [];
    const idToDrugMap = {
      42920398: 'atezolizumab',
      1594046: 'durvalumab',
      1594038: 'durvalumab',
      46275962: 'ipilimumab',
      42920744: 'nivolumab',
      42922127: 'nivolumab',
      42921578: 'pembrolizumab'
    };

    function formatDate(dateString) {
        const [year, month, day] = dateString.split('-').map(part => part.padStart(2, '0'));
        return `${year}.${month}.${day}`;
    }

    onMount(() => {
        measurementDates.subscribe(data => {
            measurements = data.map(date => date || 0); // 결측치 0으로 채우기
            // measurements = data.filter(date => date);  //결측치 제거
            // console.log(measurements);
        });

        drugExposureStartDates.subscribe(dates => {

            drugExposureDates = dates.map((date, index) => date || measurements[index]);  // 결측치는 measurement에서 채움
            drugExposureDates = drugExposureDates.filter(date => date);
            const dateSet = new Set(drugExposureDates);
            uniqueDates = Array.from(dateSet);
            formattedDates = uniqueDates.map(date => formatDate(date));
        });

        drugConceptIds.subscribe(ids => {
            drugs = Array.from(new Set(ids.filter(id => idToDrugMap[id])
               .map(id => idToDrugMap[id])));
        });

        drugNames.subscribe(data => {
            takenDrugs = data.filter(name => name); 
            toxic = Array.from(new Set(takenDrugs)).filter(name => !drugs.includes(name));
        });

        grades.subscribe(data => {
                hepatoxicityGrades = data.filter(grade => grade); // Filter out empty values
        });
    });
    
    const getToxicIndex = (name) => toxic.indexOf(name) + 1;
    const getDateIndex = (date) => uniqueDates.indexOf(date) + 1;
    const getDateOriginalIndex = (date) => drugExposureDates.indexOf(date) + 1;
    const getDrugIndex = (drug) => drugs.indexOf(drug) + 1;
    
    
    let canvas;
    import BlackDia from '../img/BlackDia.png';
    import BlueDia from '../img/BlueDia.png';
    import Nan from '../img/Nan.png';
    import Grade1 from '../img/Grade1.png';
    import Grade2 from '../img/Grade2.png';
    import Grade3 from '../img/Grade3.png';
    import DateRed from '../img/DateRed.png';
    import OrangeDia from '../img/OrangeDia.png';


    function draw() {
        if (canvas.getContext) {
            var ctx = canvas.getContext("2d");

            const margin = 33;     // 가장자리 사이 여백
            const moveDown = 15;
            const startX = margin;
            const endX = 2000 - margin;
            const startY = margin + moveDown;
            const endY = 1000 - margin + moveDown;
            const y = startY + 25;
            const verticalX1 = startX + 160;
            const verticalX2 = endX - 160;
            const linespacing = 17;


            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            let dates = formattedDates;

            let newLineY = startY + 32 + (drugs.length * linespacing);
            let safeStartY = newLineY + (toxic.length * linespacing);
            let safeEndY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);


            function drawRectangle(startX, startY, endX, endY) {  // 차트 테두리
                ctx.beginPath();
                ctx.rect(startX, startY, endX - startX, endY-startY);
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
            function writeRightAlignedText(text, x, y, size=15,  color = 'black') {
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
                drawRectangle(margin, margin + moveDown, 2000 - margin, safeWriteEndY+linespacing*3);
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
                    writeLeftAlignedText(safe[i], endX - 153,  safeWriteStartY + (i * linespacing), 15);
                }
                if (safe.includes('LOLA*') || safe.includes('MCTs')) {
                    writeLeftAlignedText('LOLA* : L-ornithine L-aspartate; MCTs : Medium Chain Triglycerides', margin + 8, safeWriteEndY+linespacing*3-5, 12);
                }
            }

            function writeDate() {
                const linespace = (verticalX2 - verticalX1)/dates.length;

                for (let i = 0; i < dates.length; i++) {
                    ctx.save();
                    ctx.translate(verticalX1 + linespace + (i * linespace), safeEndY+linespacing+15);
                    ctx.rotate(-Math.PI / 9);
                    writeRightAlignedText(dates[i], 0, 0, 13);
                    ctx.restore();
                }
            }
            

            function drawToxic() {
                let drugIndex, dateIndex;
                for (let i = 0; i < takenDrugs.length; i++) {
                    if (!drugs.includes(takenDrugs[i])) {
                        drugIndex = getToxicIndex(takenDrugs[i]);
                        dateIndex = getDateIndex(drugExposureDates[i]);
                        drawBlueDia(dateIndex, drugIndex);
                    }
                }
            }

            function drawBlueDia(datesIndex, toxicIndex) {    
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const linespaceY = (safeStartY - newLineY) / toxic.length;
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                const y = newLineY +linespaceY*(toxicIndex-0.3);
                
                const image = new Image();
                image.src = BlueDia;
                image.onload = function() {
                    ctx.drawImage(image, x-10, y-5, 10, 10);
                };
            }

            function drawBlackDia(datesIndex, safeIndex) {    
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const linespaceY = (safeEndY - safeStartY) / safe.length;
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                const y = safeStartY +linespaceY*(safeIndex-0.3);

                const image = new Image();
                image.src = BlackDia;
                image.onload = function() {
                    ctx.drawImage(image, x-10, y-5, 10, 10);
                };
            }

            function drawGrade(dateIndex, grade) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
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
                }
            }

            function drawOrangeDia(datesIndex, drugsIndex) {
                let startLineY = startY + 25;
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const linespaceY = (newLineY - startLineY-10) / drugs.length;                
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                const y = startLineY +linespaceY*(drugsIndex-0.3);

                const image = new Image();
                image.src = OrangeDia;
                image.onload = function() {
                    ctx.drawImage(image, x-11, y-5, 12, 12);
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
            }    // 함 ㅜ너가 이상하다 getdrugindexinTakenDrugs를 왜 안썼지 뭐지


            function drawDateRedShape(datesIndex) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;             
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                let safeWriteEndY = safeEndY + linespacing;
                const image = new Image();
                image.src = DateRed;
                image.onload = function() {
                    ctx.drawImage(image, x-10, safeWriteEndY-6, 13, 13);
                };
            }

            
            function drawDateGrade() {
                let coordinates = [];
                let dateIndex;
                for (let i = 0; i < measurements.length; i++) {
                    if (measurements[i] !== 0) {
                        dateIndex = getDateIndex(measurements[i]);
                        drawDateRedShape(dateIndex); 
                        coordinates.push([dateIndex, hepatoxicityGrades[i]]);
                    }
                }
                coordinates = coordinates.filter((item, index) => {
                    return coordinates.findIndex((coord) => coord[0] === item[0] && coord[1] === item[1]) === index;
                });  // 중복 제거
                coordinates.forEach(coord => {
                    let x = coord[0];
                    let y = coord[1];
                    drawGrade(x, parseInt(y));
                });
            }
            
            drawLine(startX, y, endX, y);
            writeLeftAlignedText('Patient number: 58', margin + 10, 20);
            writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);
            writeRightAlignedText('hepatoxicity', startX+153, startY + 17, 15, 'red'); 
            writeLeftAlignedText('hepatoxicity', endX-153, startY + 17, 15, 'red');
            ICI();
            writeDrugName();
            writeDate();
            drawToxic();
            drawICI();
            drawDateGrade();
            // drawGrade(5, 3)

            
            
        }
    }

    onMount(() => {
        draw();
    });
    


</script>

<canvas bind:this={canvas} width="2000" height="1600" style="border:1px solid #000000; width: 100%;"></canvas>
