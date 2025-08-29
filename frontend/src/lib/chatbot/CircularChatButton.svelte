<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let isOpen = false;
    
    function toggleChat() {
        isOpen = !isOpen;
        dispatch('toggle', { isOpen });
    }
</script>

<button class="chat-button" on:click={toggleChat} class:active={isOpen}>
    {#if isOpen}
        ✕
    {:else}
        💬
    {/if}
</button>

<style>
    .chat-button {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #216BC4, #1976D2);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(33, 107, 196, 0.3);
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(33, 107, 196, 0.4);
    }
    
    .chat-button.active {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        transform: rotate(90deg);
    }
    
    .chat-button:active {
        transform: scale(0.95);
    }
</style>
