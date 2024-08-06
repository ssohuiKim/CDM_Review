<script>
    import { onMount } from 'svelte'; // Import onMount lifecycle function
    import { initializeDuckDB } from '$lib/duckdb';
    import Spinner from '$lib/components/Spinner.svelte';
    import { writable } from 'svelte/store';

    const loading = writable(false); // Manage loading state
    let csvData = []; // Array to hold CSV data

    async function loadCsvData() {
        loading.set(true); // Start loading
        try {
            const response = await fetch('/masterList.csv'); // Fetch CSV from static directory
            const text = await response.text();

            const db = await initializeDuckDB();
            await db.registerFileText('data.csv', text);
            const connection = await db.connect();
            await connection.query(`
                CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.csv');
            `);

            // Fetch parsed data
            const result = await connection.query(`SELECT * FROM patients`);
            csvData = result.toArray(); // Ensure reactivity by reassigning

            console.log(csvData); // Optionally log data for debugging
        } catch (error) {
            console.error('Error loading CSV data:', error);
        } finally {
            loading.set(false); // End loading
        }
    }

    onMount(() => {
        loadCsvData(); // Load data when the component mounts
    });
</script>

{#if $loading}
    <Spinner />
{:else}
    <div>
        <p>CSV Data</p>
        <ul>
            {#each csvData as row, index}
                <li key={index}>
                    {#each Object.entries(row) as [key, value]}
                        {value} &nbsp;
                    {/each}
                </li>
            {/each}
        </ul>
    </div>
{/if}
