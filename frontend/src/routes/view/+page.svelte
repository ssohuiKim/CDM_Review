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
    import { drugExposureStartDates } from '$lib/stores'; // Import the specific store
  
    let uniqueDates = [];
    let formattedDates = [];
  
    function formatDate(dateString) {
      const [year, month, day] = dateString.split('-').map(part => part.padStart(2, '0'));
      return `${year}-${month}-${day}`;
    }
  
    onMount(() => {
      drugExposureStartDates.subscribe(dates => {
        const dateSet = new Set(dates.filter(date => date)); // Filter out empty values
        uniqueDates = Array.from(dateSet); // Convert Set back to Array
  
        if (uniqueDates.length > 0) {
          // Format the first date with year-month-day
          formattedDates = [formatDate(uniqueDates[0])];
  
          // Format the rest of the dates without the year
          for (let i = 1; i < uniqueDates.length; i++) {
            const [year, month, day] = uniqueDates[i].split('-').map(part => part.padStart(2, '0'));
            formattedDates.push(`${month}.${day}`);
          }
        }
        console.log("Formatted Drug Exposure Start Dates:", formattedDates);
      });
    });
  </script>
  
  <div class="container">
    <h1>Unique Drug Exposure Start Dates</h1>
    {#if formattedDates.length > 0}
      <ul>
        {#each formattedDates as date}
          <li>{date}</li>
        {/each}
      </ul>
    {:else}
      <p>No data available.</p>
    {/if}
  </div>
  