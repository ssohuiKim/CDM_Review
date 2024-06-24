<!--  toxic, safe list가 바뀔 일은 없나? -->
<script>
    import { onMount } from 'svelte';
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

            let drugs = ['atezolizumab', 'second', 'third'];  // ICI list
            let dates = ['21.06.22', '06.23', '06.24', '06.30', '07.12', '08.02', '08.23', '09.13', '09.14', '09.15',
            '09.16', '09.17', '09.18', '09.24', '10.05', '10.12', '10.13', '10.14', '10.15', '10.16', '10.17', '10.18', 
            '10.19', '10.20', '10.21', '10.22', '10.23', '10.24', '10.25', '10.26', '10.27', '10.28', '10.29', '10.30', 
            '10.31', '11.01', '11.02', '11.03',];   // 검진일 list
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
                    ctx.drawImage(image, x-5, y-5, 10, 10);
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
                    ctx.drawImage(image, x-5, y-5, 10, 10);
                };
            }

            function drawHepatoxicity(datesIndex) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const x = verticalX1 + linespaceX * (datesIndex-0.3);

                const image = new Image();
                image.src = Nan;
                image.onload = function() {
                    ctx.drawImage(image, x-5, startY+5, 15, 15);
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
                    ctx.drawImage(image, x-5, y-5, 13, 13);
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
