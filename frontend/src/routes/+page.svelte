<script>
  import { Card, CardBody, CardFooter, El, Button, CardActions, FileUpload, Icon } from "yesvelte";
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

<El container m="0" p="4">
  <El row tag="h1">CDM-Review</El>
  <El row tag="h3">CDM-Review is a web tool that visualizes data obtained from CDM on patients taking immune checkpoint inhibitors who showed Hepatotoxicity.<br> 
    It would help medical professionals identify patients and make medication-related decisions.</El>
  <El row style="margin-top: 52px;">
    <Card col="7">
      <CardBody>
        <El row tag="strong">Choose a csv file</El>
        <FileUpload mt="2" state={state_1} bind:files={files_1} />
        <El textColor="danger" tag="small">{hint_1}</El>
      </CardBody>
      <CardFooter>
        <CardActions>
          <Button color="primary" on:click={handleClick}>
            <Icon name="upload" />Upload
          </Button>
        </CardActions>
      </CardFooter>
    </Card>
  </El>
</El>
