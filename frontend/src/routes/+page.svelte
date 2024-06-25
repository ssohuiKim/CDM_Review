<script>
  import { Divider, El, FileUpload } from "yesvelte";
  import { Button, Icon } from 'yesvelte';
  import { goto } from '$app/navigation';
  import Papa from 'papaparse';
  import { parsedData } from '$lib/stores';

  let files_1;
  let hint_1 = "";
  let state_1 = void 0;

  $: console.log(files_1);

  $: if (files_1 && files_1[0] && files_1[0].type !== "text/csv") {
    hint_1 = "File type should be csv";
    state_1 = "invalid";
  } else {
    hint_1 = "";
    state_1 = void 0;
  }

  function handleClick() {
    if (files_1 && files_1[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        Papa.parse(csvData, {
          header: true,
          complete: function(results) {
            parsedData.set(results.data);
            goto('/view');
          }
        });
      };
      reader.readAsText(files_1[0]);
    }
  }
</script>

<div class="container">
  <El tag="strong">Choose a csv file</El>
  <FileUpload mt="2" state={state_1} bind:files={files_1} />
  <El textColor="danger" tag="small">{hint_1}</El>
  <Button color="light" on:click={handleClick}>
    <Icon name="upload" />Upload
  </Button>
</div>

<slot/>
