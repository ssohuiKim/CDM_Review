<script>
    import { onMount } from 'svelte';
    let canvas;

    function draw() {
        if (canvas.getContext) {
            var ctx = canvas.getContext("2d");

            ctx.fillRect(25, 25, 100, 100);
            ctx.clearRect(45, 45, 60, 60);
            ctx.strokeRect(50, 50, 50, 50);
        }
    }
    
    onMount(() => {
        draw();
	})
</script>

<canvas bind:this={canvas} width="2000" height="1000" style="border:1px solid #000000; width: 100%; height: 100%;"></canvas>