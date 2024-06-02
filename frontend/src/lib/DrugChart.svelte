<script>
    import { onMount } from 'svelte';
    let canvas;

    function draw() {
        if (canvas.getContext) {
            var ctx = canvas.getContext("2d");

            const margin = 50; // 화면 가장자리와 네모 사이의 여백
            const startX = margin;
            const endX = 2000 - margin; // 캔버스 실제 너비에서 여백을 뺀 값
            const startY = margin;
            const endY = 1000 - margin; // 캔버스 실제 높이에서 여백을 뺀 값
            const y = startY + 50;
            const offsetY = 35;
            const verticalX1 = startX + 150;
            const verticalX2 = endX - 150;
            const horizontalY = endY - 50; // 네모 안의 맨 마지막 수평선의 Y 좌표

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            function drawRectangle(startX, startY, endX, endY) {
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

            drawRectangle(margin, margin, 2000 - margin, 1000 - margin);

            drawLine(startX, y, endX, y);
            drawLine(startX, y + offsetY, endX, y + offsetY);
            drawLine(verticalX1, startY, verticalX1, endY-50);
            drawLine(verticalX2, startY, verticalX2, endY-50);
            drawLine(verticalX1, horizontalY, verticalX2, horizontalY); // 네모 안의 맨 마지막 수평선 추가
        }
    }
    
    onMount(() => {
        draw();
    })
</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>
