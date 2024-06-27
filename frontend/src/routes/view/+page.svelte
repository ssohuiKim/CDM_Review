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
  </div> -->
  
 <script>
  import { onMount } from 'svelte';
  import {drugConceptIds, drugNames, drugExposureStartDates, measurementDates, grades} from '$lib/stores';
  let takenDrugs = [];
  let drugExposureDates = [];
  let measurements = [];
  let hepatoxicityGrades = [];

  let toxic = [];
  let safe = [];
  let uniqueDates = [];
  let formattedDates = [];
  let drugs = [];
  const idToDrugMap = {
    42920398: 'atezolizumab',
    1594046: 'durvalumab',
    1594038: 'durvalumab',
    46275962: 'ipilimumab',
    42920744: 'nivolumab',
    42922127: 'nivolumab',
    42921578: 'pembrolizumab'
  };

  function formatDate(dateString) {
      const [year, month, day] = dateString.split('-').map(part => part.padStart(2, '0'));
      return `${year}.${month}.${day}`;
  }

  onMount(() => {
      measurementDates.subscribe(data => {
          measurements = data.map(date => date || 0); // 결측치 0으로 채우기
          // measurements = data.filter(date => date);  //결측치 제거
          // console.log(measurements);
      });

      drugExposureStartDates.subscribe(dates => {

          drugExposureDates = dates.map((date, index) => date || measurements[index]);  // 결측치는 measurement에서 채움
          drugExposureDates = drugExposureDates.filter(date => date);
          const dateSet = new Set(drugExposureDates);
          uniqueDates = Array.from(dateSet);
          formattedDates = uniqueDates.map(date => formatDate(date));
      });

      drugConceptIds.subscribe(ids => {
          drugs = Array.from(new Set(ids.filter(id => idToDrugMap[id])
              .map(id => idToDrugMap[id])));
      });

      drugNames.subscribe(data => {
          takenDrugs = data.filter(name => name); 
          toxic = Array.from(new Set(takenDrugs)).filter(name => !drugs.includes(name));
      });

      grades.subscribe(data => {
              hepatoxicityGrades = data.filter(grade => grade); // Filter out empty values
      });
  });
  
  const getToxicIndex = (name) => toxic.indexOf(name) + 1;
  const getDateIndex = (date) => uniqueDates.indexOf(date) + 1;
  const getDrugIndex = (drug) => drugs.indexOf(drug) + 1;
  const getDrugIndexInTakenDrugs = (drug) => {
      let indices = [];
      takenDrugs.forEach((item, index) => {
      if (item.toLowerCase() === drug.toLowerCase()) {
          indices.push(index);
      }
  });
  return indices;}
  let coordinates = [];
</script>
  
<div class="container">
  <h1>Measurement Dates and Hepatoxicity Grades</h1>
  <ul>
    {#each measurements as measurement, index}
      {#if measurement !== 0}
        coordinates.push({getDateIndex(measurement) + 1, hepatoxicityGrades[index]});
        <li>
          <!-- <p>{measurement} - (Date Index: {getDateIndex(measurement) + 1})</p>
          <p>Hepatoxicity Grade: {hepatoxicityGrades[index]}</p> -->
          
          {measurement} - coordinates: {coordinates}
        </li>
      {/if}
    {/each}
</div>
