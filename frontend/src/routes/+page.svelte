
<script>
  import { Card, CardBody, CardFooter, El, Button, CardActions, FileUpload, Icon } from "yesvelte";
  // import { Button, Icon } from 'yesvelte';
  import { goto } from '$app/navigation';
  import Papa from 'papaparse';
  import {
    parsedData,
    patientNos,
    subs,
    indexDates,
    followEnds,
    indexLastdates,
    visitLastDays,
    drugExposureStartDates,
    drugConceptIds,
    drugNames,
    drugNameDoses,
    measurementDates,
    grades
  } from '$lib/stores';

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
            const data = results.data;
            parsedData.set(data);

            // Extract specific columns into separate lists
            const patientNumbers = data.map(row => row.Patient_no);
            const subsList = data.map(row => row.sub);
            const indexDatesList = data.map(row => row.index_date);
            const followEndsList = data.map(row => row.follow_end);
            const indexLastdatesList = data.map(row => row.index_lastdate);
            const visitLastDaysList = data.map(row => row.visit_last_Day);
            const drugExposureStartDatesList = data.map(row => row.drug_exposure_start_date);
            const drugConceptIdsList = data.map(row => row.drug_concept_id);
            const drugNamesList = data.map(row => row.drug_name);
            const drugNameDosesList = data.map(row => row.drug_name_dose);
            const measurementDatesList = data.map(row => row.measurement_date);
            const gradesList = data.map(row => row.grade);

            // Update the stores with these lists
            patientNos.set(patientNumbers);
            subs.set(subsList);
            indexDates.set(indexDatesList);
            followEnds.set(followEndsList);
            indexLastdates.set(indexLastdatesList);
            visitLastDays.set(visitLastDaysList);
            drugExposureStartDates.set(drugExposureStartDatesList);
            drugConceptIds.set(drugConceptIdsList);
            drugNames.set(drugNamesList);
            drugNameDoses.set(drugNameDosesList);
            measurementDates.set(measurementDatesList);
            grades.set(gradesList);

            goto('/result');
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
  <!-- <Button color="primary" on:click={() => goto('/result')}>View</Button> -->
</El>
