<!--  toxic, safe list가 바뀔 일은 없나? -->
<script>
    import { onMount } from 'svelte';
    import {drugConceptIds, drugExposureStartDates} from '$lib/stores';
    let uniqueDates = [];
    let formattedDates = [];

    let drugs = [];
    const idToDrugMap = {
      42920398: 'Atezolizumab',
      1594046: 'Durvalumab',
      1594038: 'Durvalumab',
      46275962: 'Ipilimumab',
      42920744: 'Nivolumab',
      42922127: 'Nivolumab',
      42921578: 'Pembrolizumab'
    };

    function formatDate(dateString) {
      const [year, month, day] = dateString.split('-').map(part => part.padStart(2, '0'));
      return `${year}.${month}.${day}`;
    }

    onMount(() => {
        drugConceptIds.subscribe(ids => {
            drugs = Array.from(new Set(ids.filter(id => idToDrugMap[id])
               .map(id => idToDrugMap[id])));
        console.log("ICI List:", drugs);
        });

        drugExposureStartDates.subscribe(dates => {
            const dateSet = new Set(dates.filter(date => date)); // Filter out empty values
            uniqueDates = Array.from(dateSet); // Convert Set back to Array
    
            if (uniqueDates.length > 0) {
            // 년도 포함된 날짜 format
            formattedDates = [formatDate(uniqueDates[0])];
    
            // 년도 없이 나머지 날짜 format
            for (let i = 1; i < uniqueDates.length; i++) {
                const [year, month, day] = uniqueDates[i].split('-').map(part => part.padStart(2, '0'));
                formattedDates.push(`${month}.${day}`);
            }
            }
            console.log("Formatted Drug Exposure Start Dates:", formattedDates);
        });
    });
    

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
            let toxic = ['fluorouracil', 'megestrol', 'dexamethasone', 'propofol', 'cimetidine', 'ciprofloxacin', 
            'esomeprazole', 'irinotecan', 'lansoprazole', 'metronidazole', 'pantoprazole', 'cefotaxime', 'cefpodoxime', 'meropenem', 
            'spironolactone', 'acetylcysteine', 'atropine', 'bevacizumab', 'furosemide', 'leucovorin', 'meperidine', 
            'midazolam', 'niacinamide', 'palonosetron', 'pyridoxine', 'rifaximin', 'thiamine', 'ceftizoxime', 'entecavir'];
            let safe = ['amino acids', 'albumin human', 'flumazenil', 'glucose', 'isoleucine','lactitol', 'lactulose', 'lafutidine', 'leucine', 'LOLA*', 'magnesium oxide', 
            'MCTs*', 'mosapride', 'nafamostat mesilate', 'potassium chloride', 'propacetramol hcl', 'sodium chlorid', 'soybean oil', 'teicoplanin', 'threonine', 'ursodeoxycholate'];

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

            function drawHepatoxicity(datesIndex) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const x = verticalX1 + linespaceX * (datesIndex-0.3);

                const image = new Image();
                image.src = Nan;
                image.onload = function() {
                    ctx.drawImage(image, x-10, startY+5, 15, 15);
                };
            }

            function drawICI(datesIndex, drugsIndex) {
                let startLineY = startY + 25;
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const linespaceY = (newLineY - startLineY-10) / drugs.length;                
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                const y = startLineY +linespaceY*(drugsIndex-0.3);

                const image = new Image();
                image.src = OrangeDia;
                image.onload = function() {
                    ctx.drawImage(image, x-10, y-5, 13, 13);
                };
            }
            function drawDate(datesIndex) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;             
                const x = verticalX1 + linespaceX * (datesIndex-0.3);
                let safeWriteEndY = safeEndY + linespacing;
                const image = new Image();
                image.src = DateRed;
                image.onload = function() {
                    ctx.drawImage(image, x-10, safeWriteEndY-6, 13, 13);
                };
            }
            
            drawLine(startX, y, endX, y);
            writeLeftAlignedText('Patient number: 58', margin + 10, 20);
            writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);
            writeRightAlignedText('hepatoxicity', startX+153, startY + 17, 15, 'red'); 
            writeLeftAlignedText('hepatoxicity', endX-153, startY + 17, 15, 'red');
            ICI();
            writeDrugName();
            writeDate();

            
            
        }
    }

    onMount(() => {
        draw();
    });
    


</script>

<canvas bind:this={canvas} width="2000" height="1600" style="border:1px solid #000000; width: 100%;"></canvas>
