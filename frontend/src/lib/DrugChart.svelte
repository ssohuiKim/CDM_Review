<!--  toxic, safe list가 바뀔 일은 없나? -->
<script>
    import { onMount } from 'svelte';
    let canvas;
    import DateRed from '../img/DateRed.png';
    import BlueDia from '../img/BlueDia.png';

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
            let newLineY;
            let lastY;

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            let drugs = ['atezolizumab', '두번째'];  // ICI list
            let dates = ['21.06.22', '06.23', '06.24', '06.30', '07.12', '08.02', '08.23', '09.13', '09.14', '09.15',
            '09.16', '09.17', '09.18', '09.24', '10.05', '10.12', '10.13', '10.14', '10.15', '10.16', '10.17', '10.18', 
            '10.19', '10.20', '10.21', '10.22', '10.23', '10.24', '10.25', '10.26', '10.27', '10.28', '10.29', '10.30', 
            '10.31', '11.01', '11.02', '11.03'];   // 검진일 list
            let toxic = ['fluorouracil', 'megestrol', 'dexamethasone', 'propofol', 'cimetidine', 'ciprofloxacin', 
            'esomeprazole', 'irinotecan', 'lansoprazole', 'metronidazole', 'pantoprazole', 'cefotaxime', 'cefpodoxime', 'meropenem', 
            'spironolactone', 'acetylcysteine', 'atropine', 'bevacizumab', 'furosemide', 'leucovorin', 'meperidine', 
            'midazolam', 'niacinamide', 'palonosetron', 'pyridoxine', 'rifaximin', 'thiamine', 'ceftizoxime', 'entecavir'];
            let safe = ['amino acids', 'albumin human', 'flumazenil', 'glucose', 'isoleucine','lactitol', 'lactulose', 'lafutidine', 'leucine', 'LOLA*', 'magnesium oxide', 
            'MCTs*', 'mosapride', 'nafamostat mesilate', 'potassium chloride', 'propacetramol hcl', 'sodium chlorid', 'soybean oil', 'teicoplanin', 'threonine', 'ursodeoxycholate'];


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
            function ICI(drugs) {
                const numDrugs = drugs.length;
                const linespace = 18;
                const newLineY = startY + 32 + (numDrugs * linespace);

                drawLine(startX, newLineY, endX, newLineY);
                for (let i = 0; i < drugs.length; i++) {
                    writeRightAlignedText(drugs[i], startX + 153, startY + 42 + (i * linespace), 15, 'blue');
                    writeLeftAlignedText(drugs[i], endX - 153, startY + 42 + (i * linespace), 15, 'blue');
                }
                writeDrugName(newLineY);
            }       

            function writeDrugName(newLineY) {
                const linespacing = 16.5;
                newLineY += linespacing;
                const safeY = newLineY + (toxic.length * linespacing);
                const lastY = newLineY + (toxic.length * linespacing) + (safe.length * linespacing);

                drawRectangle(margin, margin + moveDown, 2000 - margin, lastY+linespacing*3);
                drawLine(verticalX1, startY, verticalX1, lastY);
                drawLine(verticalX2, startY, verticalX2, lastY);
                drawLine(verticalX1, lastY, verticalX2, lastY);
                
                for (let i = 0; i < toxic.length; i++) {
                    writeRightAlignedText(toxic[i], startX + 153, newLineY + (i * linespacing), 15, 'blue');
                    writeLeftAlignedText(toxic[i], endX - 153, newLineY + (i * linespacing), 15, 'blue');
                }
                for (let i = 0; i < safe.length; i++) {
                    writeRightAlignedText(safe[i], startX + 153, safeY + (i * linespacing), 15);
                    writeLeftAlignedText(safe[i], endX - 153,  safeY + (i * linespacing), 15);
                }
                if (safe.includes('LOLA*') || safe.includes('MCTs')) {
                    writeLeftAlignedText('LOLA* : L-ornithine L-aspartate; MCTs : Medium Chain Triglycerides', margin + 8, lastY+linespacing*3-5, 12);
                }
                writeDate(lastY);
                
            }

            function writeDate(lastY) {
                const numDates = dates.length;
                const linespace = (verticalX2 - verticalX1)/numDates;

                for (let i = 0; i < dates.length; i++) {
                    ctx.save();
                    ctx.translate(verticalX1 + linespace + (i * linespace), lastY+15);
                    ctx.rotate(-Math.PI / 9);
                    writeRightAlignedText(dates[i], 0, 0, 13);
                    ctx.restore();
                }
            }

            function drawBlueDia(toxicIndex, dateIndex) {
                const linespaceX = (verticalX2 - verticalX1) / dates.length;
                const linespaceY = (endY - startY) / toxic.length; //toxic 시작 위치에서 safe시작 위치 사이가 되어야함
                const x = verticalX1 + linespaceX * dateIndex;
                const y = startY + linespaceY * toxicIndex; // writeDrugName 함수에서 썼던 safeY와 newLineY를 사용해야하는데 안불러와짐

                const image = new Image();
                image.src = BlueDia;
                image.onload = function() {
                    ctx.drawImage(image, x, y, 15, 15);
                };
            }
            
            drawLine(startX, y, endX, y);
            writeLeftAlignedText('Patient number: 58', margin + 10, 20);
            writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);

            writeRightAlignedText('hepatoxicity', startX+153, startY + 17, 15, 'red'); 
            writeLeftAlignedText('hepatoxicity', endX-153, startY + 17, 15, 'red');
            ICI(drugs);
            writeDrugName();
            writeDate(lastY);

            
            const image = new Image();
            image.src = DateRed;
            image.onload = function() {
                const imageX = (canvas.width - image.width) / 2;
                const imageY = (canvas.height - image.height) / 2;
                ctx.drawImage(image, imageX, imageY);
            }

            drawBlueDia(1,1);
        }
    }

    onMount(() => {
        draw();
    });


</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>
