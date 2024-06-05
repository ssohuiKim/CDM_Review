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
            
            const offsetY = 25;
            const verticalX1 = startX + 160;
            const verticalX2 = endX - 160;

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            // 차트 테두리
            function drawRectangle(startX, startY, endX, endY) {
                ctx.beginPath();
                ctx.rect(startX, startY, endX - startX, endY - startY+10);
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



            drawRectangle(margin, margin + moveDown, 2000 - margin, 1000 - margin + moveDown);
            drawLine(startX, y, endX, y);
            drawLine(startX, y + offsetY, endX, y + offsetY);
            drawLine(verticalX1, startY, verticalX1, endY-40);
            drawLine(verticalX2, startY, verticalX2, endY-40);
            drawLine(verticalX1, endY-40, verticalX2, endY-40);

            writeLeftAlignedText('Patient number: 58', margin + 10, 20);
            writeLeftAlignedText('Type of cancer diagnosis: liver cancer', margin + 10, 40);

            writeRightAlignedText('hepatoxicity', startX+153, startY + 17,'red'); 
            writeRightAlignedText('atezolizumab', startX + 153, startY + 42,'blue'); 
            writeLeftAlignedText('hepatoxicity', endX-153, startY + 17, 15, 'red');
            writeLeftAlignedText('atezolizumab', endX-153, startY + 42, 15, 'blue');
            
            writeLeftAlignedText('LOLA* : L-ornithine L-aspartate; MCTs : Medium Chain Triglycerides', margin + 8, 987, 12);
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

    function writeDrugName() {
        const toxic = ['fluorouracil', 'megestrol', 'dexamethasone', 'propofol', 'cimetidine', 'ciprofloxacin', 
        'esomeprazole', 'irinotecan', 'lansoprazole', 'metronidazole', 'pantoprazole', 'cefotaxime', 'cefpodoxime', 'meropenem', 
        'spironolactone', 'acetylcysteine', 'atropine', 'bevacizumab', 'furosemide', 'leucovorin', 'meperidine', 
        'midazolam', 'niacinamide', 'palonosetron', 'pyridoxine', 'rifaximin', 'thiamine', 'ceftizoxime', 'entecavir'];
        
        const safe = ['amino acids', 'albumin human', 'flumazenil', 'glucose', 'isoleucine','lactitol', 'lactulose', 'lafutidine', 'leucine', 'LOLA*', 'magnesium oxide', 
        'MCTs', 'mosapride', 'nafamostat mesilate', 'potassium chloride', 'propacetramol hcl', 'sodium chlorid', 'soybean oil', 'teicoplanin', 'threonine', 'ursodeoxycholate'];
        
        var ctx = canvas.getContext("2d");
        const margin = 33;
        ctx.font = '15px Arial';
        ctx.fillStyle = 'blue';
        const startX = 190;
        let startY = 115;
        const lineSpacing = 16.5;
        const endX = 2000 - margin;
        ctx.textAlign = 'right';

        for (let i = 0; i < toxic.length; i++) {
            ctx.fillStyle = 'blue';
            ctx.fillText(toxic[i], startX, startY + (i * lineSpacing));
        }

        for (let i = 0; i < safe.length; i++) {
            ctx.fillStyle = 'black';
            ctx.fillText(safe[i], startX, startY + ((toxic.length + i) * lineSpacing));
        }

        ctx.textAlign = 'left';

        for (let i = 0; i < toxic.length; i++) {
            ctx.fillStyle = 'blue';
            ctx.fillText(toxic[i], endX-150, startY + (i * lineSpacing));
        }

        for (let i = 0; i < safe.length; i++) {
            ctx.fillStyle = 'black';
            ctx.fillText(safe[i], endX-150, startY + ((toxic.length + i) * lineSpacing));
        }
    }


    onMount(() => {
        draw();
    });



</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>
