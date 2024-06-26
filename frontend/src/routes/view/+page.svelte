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
  import { drugNames, drugExposureStartDates } from '$lib/stores'; // Import the specific store for drug names and dates
  let names = [];
  let drugExposureDates = [];
  
  let toxic = ['fluorouracil', 'megestrol', 'dexamethasone', 'propofol', 'cimetidine', 'ciprofloxacin', 
  'esomeprazole', 'irinotecan', 'lansoprazole', 'metronidazole', 'pantoprazole', 'cefotaxime', 'cefpodoxime', 'meropenem', 
  'spironolactone', 'acetylcysteine', 'atropine', 'bevacizumab', 'furosemide', 'leucovorin', 'meperidine', 
  'midazolam', 'niacinamide', 'palonosetron', 'pyridoxine', 'rifaximin', 'thiamine', 'ceftizoxime', 'entecavir'];
  let uniqueDates = [];
  let formattedDates = [];

  onMount(() => {
    drugExposureStartDates.subscribe(dates => {
      drugExposureDates = dates.filter(date => date); // Filter out empty values
      const dateSet = new Set(drugExposureDates);
      uniqueDates = Array.from(dateSet); // Convert Set back to Array
      
      if (uniqueDates.length > 0) {
        formattedDates = [formatDate(uniqueDates[0])];
        for (let i = 1; i < uniqueDates.length; i++) {
          const [year, month, day] = uniqueDates[i].split('-').map(part => part.padStart(2, '0'));
          formattedDates.push(`${month}.${day}`);
        }
      }
      
      console.log('Unique Dates:', uniqueDates);
      console.log('Formatted Dates:', formattedDates);
    });

    drugNames.subscribe(data => {
      names = data.filter(name => name); // Filter out empty values
      console.log('Drug Names: ', names);
    });
  });

  const formatDate = (date) => {
    const [year, month, day] = date.split('-').map(part => part.padStart(2, '0'));
    return `${year}.${month}.${day}`;
  };

  const getToxicIndex = (name) => toxic.indexOf(name) + 1;
  const getDateIndex = (date) => uniqueDates.indexOf(date) + 1;
</script>

<div class="container">
  <h1>Unique Drug Names and Dates</h1>
  {#if names.length > 0 && drugExposureDates.length > 0}
    <ul>
      {#each names as name, i}
        {#if drugExposureDates[i]} <!-- Ensure there's a corresponding date -->
          <li>
            {name} - {drugExposureDates[i]} 
            (Toxic Index: {getToxicIndex(name)}, Date Index: {getDateIndex(drugExposureDates[i])})
          </li>
        {/if}
      {/each}
    </ul>
  {:else}
    <p>No data available.</p>
  {/if}
</div>
