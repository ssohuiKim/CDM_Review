<!-- <script>
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
   -->

   <script>
    import { onMount } from 'svelte';
    import { drugConceptIds } from '$lib/stores'; // Import the specific store
  
    let iciList = [];
  
    // Map specific drug concept IDs to corresponding letters
    const idToLetterMap = {
      42920398: 'Atezolizumab',
      1594046: 'Durvalumab',
      1594038: 'Durvalumab',
      46275962: 'Ipilimumab',
      42920744: 'Nivolumab',
      42922127: 'Nivolumab',
      42921578: 'Pembrolizumab'
    };
  
    onMount(() => {
      drugConceptIds.subscribe(ids => {
        // Filter the IDs and map to corresponding letters
        iciList = Array.from(new Set(ids.filter(id => idToLetterMap[id])
               .map(id => idToLetterMap[id])));
        console.log("ICI List:", iciList);
      });
    });
  </script>
  
  <div class="container">
    <h1>ICI List</h1>
    {#if iciList.length > 0}
        <li>{iciList}</li>
    {:else}
      <p>No data available.</p>
    {/if}
  </div>
  