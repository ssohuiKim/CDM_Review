<script>
  import { onMount } from 'svelte';
  import dateFormat from 'dateformat'; 

  export let selectedPatient;
  export let patientData;

  let takenDrugs = [];
  let drugExposureDates = [];
  let measurements = [];
  let hepatotoxicityGrade = [];

  let toxic = [];
  let safe = [];
  let uniqueDates = [];
  let formattedDates = [];
  let drugs = [];
  let drugAll = [];
  let isDataInitialized = false;

  const idToDrugMap = {
    42920398: 'atezolizumab',
    1594046: 'durvalumab',
    1594038: 'durvalumab',
    46275962: 'ipilimumab',
    42920744: 'nivolumab',
    42922127: 'nivolumab',
    42921578: 'pembrolizumab'
  };

  function formatDate(dateString, isFirstDate = false) {
    let d = new Date(dateString);
    return isFirstDate ? dateFormat(d, "yy.mm.dd") : dateFormat(d, "mm.dd");
  }

  async function fetchMasterList() {
    const response = await fetch('/toxicDrugs.json');
    const jsonData = await response.json();
    return jsonData
      .map(entry => entry.trim().toLowerCase());
  }

  async function initializeData() {
    if (selectedPatient && patientData[selectedPatient]) {
      const data = patientData[selectedPatient];

      measurements = data.map(row => row.measurement_date || 0); // 결측치 0으로 채우기

      drugExposureDates = data.map(row => row.drug_exposure_start_date || row.measurement_date).filter(Boolean);
      uniqueDates = Array.from(new Set(drugExposureDates));
      formattedDates = uniqueDates.map((date, index) => formatDate(date, index === 0));

      drugs = Array.from(new Set(data.map(row => row.drug_concept_id).filter(id => idToDrugMap[id]).map(id => idToDrugMap[id])));

      takenDrugs = data.map(row => row.drug_name).filter(Boolean);
      takenDrugs = takenDrugs.map(drug => drug.toLowerCase());
      takenDrugs = takenDrugs.map(drug => {
        if (drug === 'l-ornithine-l-') {
          return 'LOLA*';
        } else if (drug === 'medium chain t') {
          return 'MCTs*';
        } else {
          return drug;
        }
      });
      
      drugAll = Array.from(new Set(takenDrugs)).filter(name => !drugs.includes(name));
      const masterList = await fetchMasterList();

      return { data, masterList };
    }
    return null;
  }

  function processData(data, masterList) {
    return new Promise((resolve) => {
      const worker = new Worker('/worker.js');
      worker.postMessage({ data: drugAll, toxicList: masterList });
      worker.onmessage = function(e) {
        const { toxic: toxicDrugs, safe: safeDrugs } = e.data;
        toxic = Array.from(new Set(toxicDrugs));
        safe = Array.from(new Set(safeDrugs));
        hepatotoxicityGrade = data.map(row => row.grade).filter(Boolean);
        resolve();
      };
    });
  }

  function draw() {
    if (canvas && canvas.getContext) {
      var ctx = canvas.getContext("2d");

    }
  }

  let canvas;

  $: if (isDataInitialized) {
    draw();
  }

  $: {
    if (selectedPatient && patientData) {
      isDataInitialized = false;
      initializeData().then(async result => {
        if (result) {
          await processData(result.data, result.masterList);
          isDataInitialized = true;
        }
      });
    }
  }

</script>

<canvas bind:this={canvas} width="2000" height="1600" style="border:1px solid #000000; width: 100%;"></canvas>