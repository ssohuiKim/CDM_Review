<script>
    import { parsedData } from '$lib/stores';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
  
    let data = [];
  
    onMount(() => {
      data = get(parsedData);
      console.log(data);
    });
  </script>
  
  <div class="container">
    <h1>Parsed CSV Data</h1>
    {#if data.length > 0}
      <table>
        <thead>
          <tr>
            {#each Object.keys(data[0]) as key}
              <th>{key}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each data as row}
            <tr>
              {#each Object.values(row) as value}
                <td>{value}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No data available.</p>
    {/if}
  </div>
  