<script lang="ts">
    import { Divider, El, FileUpload } from "yesvelte";
    import { Button, Icon } from 'yesvelte';

    let files_1;
    let hint_1 = "";
    let state_1 = void 0;
    $:
      console.log(files_1);
    $:
      if (files_1 && files_1[0] && files_1[0].type !== "text/csv") {
        hint_1 = "File type should csv";
        state_1 = "invalid";
      } else {
        hint_1 = "";
        state_1 = void 0;
      }
    </script>

<El tag="strong">Choose a csv file</El>
<FileUpload mt="2" state={state_1} bind:files={files_1} />
<El textColor="danger" tag="small">{hint_1}</El>
<Button color="warning">
	<Icon name="heart" />I like
</Button>