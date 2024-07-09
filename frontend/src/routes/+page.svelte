<script>
  import { Card, CardBody, CardFooter, El, Button, CardActions, FileUpload, Icon } from "yesvelte";
  import { goto } from '$app/navigation';
  import { parsedData, groupedPatientData } from '$lib/stores';
  import { initializeDuckDB } from '$lib/duckdb';

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

  // 프록시 객체를 일반 객체로 변환하는 함수
  function convertRowToObject(row) {
    const result = {};
    for (const key of Object.keys(row)) {
      if (row[key] instanceof Date) {
        result[key] = row[key].toISOString(); // 날짜를 ISO 문자열로 변환
      } else if (typeof row[key] === 'bigint') {
        result[key] = row[key].toString(); // BigInt를 문자열로 변환
      } else {
        result[key] = row[key];
      }
    }
    return result;
  }

  async function handleClick() {
    if (files_1 && files_1[0]) {
      const db = await initializeDuckDB();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target.result;

        // CSV 데이터를 DuckDB에 등록하고 파싱
        await db.registerFileText('data.csv', csvData);
        const connection = await db.connect();
        await connection.query(`
          CREATE TABLE patients AS SELECT * FROM read_csv_auto('data.csv');
        `);
        // await connection.query(`
        //   CREATE TABLE patients AS SELECT * FROM read_csv('data.csv', delim=',', header=true, columns={Patient_no: 'STRING', drug_concept_id: 'STRING', drug_exposure_start_date: 'STRING', drug_name: 'STRING', drug_name_dose: 'STRING', follow_end: 'STRING', grade: 'STRING', index_date: 'STRING', index_lastdate: 'STRING', measurement_date: 'STRING', sub: 'STRING', visit_last_Day: 'STRING'});
        // `);

        // 파싱된 데이터 가져오기
        const result = await connection.query(`SELECT * FROM patients`);
        const parsedResult = result.toArray().map(convertRowToObject);
        parsedData.set(parsedResult);

        // Patient_no 기준으로 데이터 그룹화
        const groupedData = parsedResult.reduce((acc, row) => {
          const patientNo = row.Patient_no;
          if (!acc[patientNo]) {
            acc[patientNo] = [];
          }
          acc[patientNo].push(row);
          return acc;
        }, {});

        // 그룹화된 데이터 스토어에 업데이트
        groupedPatientData.set(groupedData);

        // 결과 페이지로 이동
        goto('/result');
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
