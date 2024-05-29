<script>
    import { onMount } from 'svelte';
    let canvas;

    function draw() {
        if (canvas.getContext) {
            var ctx = canvas.getContext("2d");

            const startX = 0;
            const endX = 2000;
            const y = 50;
            const offsetY = 35;
            const startY = 0;
            const endY = 930;
            const verticalX1 = 150;
            const verticalX2 = endX - 150;

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            function drawLine(startX, startY, endX, endY) {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            drawLine(startX, y, endX, y);
            drawLine(startX, y + offsetY, endX, y + offsetY);
            drawLine(verticalX1, startY, verticalX1, endY);
            drawLine(verticalX2, startY, verticalX2, endY);
            drawLine(verticalX1, endY, verticalX2, endY);
        }
    }
    
    onMount(() => {
        draw();
	})
</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>
