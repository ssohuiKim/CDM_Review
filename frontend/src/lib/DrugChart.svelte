<script>
    import { onMount } from 'svelte';
    let canvas;
    import DateRed from '../img/DateRed.png';

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

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            let drugs = ['atezolizumab', '두번째 약'];  // ICI list

            function drawRectangle(startX, startY, endX, endY) {  // 차트 테두리
                ctx.beginPath();
                ctx.rect(startX, startY, endX - startX, endY);
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
            function writeRightAlignedText(text, x, y, color = 'black') {
                ctx.font = '15px Arial';
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
                const toxic = ['fluorouracil', 'megestrol', 'dexamethasone', 'propofol', 'cimetidine', 'ciprofloxacin', 
                'esomeprazole', 'irinotecan', 'lansoprazole', 'metronidazole', 'pantoprazole', 'cefotaxime', 'cefpodoxime', 'meropenem', 
                'spironolactone', 'acetylcysteine', 'atropine', 'bevacizumab', 'furosemide', 'leucovorin', 'meperidine', 
                'midazolam', 'niacinamide', 'palonosetron', 'pyridoxine', 'rifaximin', 'thiamine', 'ceftizoxime', 'entecavir'];
                
                const safe = ['amino acids', 'albumin human', 'flumazenil', 'glucose', 'isoleucine','lactitol', 'lactulose', 'lafutidine', 'leucine', 'LOLA*', 'magnesium oxide', 
                'MCTs*', 'mosapride', 'nafamostat mesilate', 'potassium chloride', 'propacetramol hcl', 'sodium chlorid', 'soybean oil', 'teicoplanin', 'threonine', 'ursodeoxycholate'];

                const linespacing = 16.5;
                newLineY += linespacing;
                const safeY = newLineY + (toxic.length * linespacing);

                drawLine(startX, newLineY, endX, newLineY);
                
                for (let i = 0; i < toxic.length; i++) {
                    writeRightAlignedText(toxic[i], startX + 153, newLineY + (i * linespacing), 15, 'blue');
                    writeLeftAlignedText(toxic[i], endX - 153, newLineY + (i * linespacing), 15, 'blue');
                }
                for (let i = 0; i < safe.length; i++) {
                    writeRightAlignedText(safe[i], startX + 153, safeY + (i * linespacing), 15);
                    writeLeftAlignedText(safe[i], endX - 153,  safeY + (i * linespacing), 15);
                }
                if (safe.includes('LOLA*') || safe.includes('MCTs')) {
                    writeLeftAlignedText('LOLA* : L-ornithine L-aspartate; MCTs : Medium Chain Triglycerides', margin + 8, 987, 12);
                }
            }



            drawRectangle(margin, margin + moveDown, 2000 - margin, 1000 - 2*margin +10);
            drawLine(startX, y, endX, y);
            drawLine(verticalX1, startY, verticalX1, endY-40);
            drawLine(verticalX2, startY, verticalX2, endY-40);
            drawLine(verticalX1, endY-40, verticalX2, endY-40);

            writeLeftAlignedText('Patient number: 58', margin + 10, 20);
            writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);

            writeRightAlignedText('hepatoxicity', startX+153, startY + 17,'red'); 
            writeLeftAlignedText('hepatoxicity', endX-153, startY + 17, 15, 'red');
            ICI(drugs);
            writeDrugName();

            const image = new Image();
            image.src = DateRed;
            image.onload = function() {
                const imageX = (canvas.width - image.width) / 2;
                const imageY = (canvas.height - image.height) / 2;
                ctx.drawImage(image, imageX, imageY);
            }
        }
    }


    onMount(() => {
        draw();
    });


</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>
