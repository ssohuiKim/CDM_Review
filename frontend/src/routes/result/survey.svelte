<script lang="ts">import { Card, FormCheckboxGroup, CardBody } from "yesvelte";
    let items = [
      { text: "Yes (+1)", code: "yes" },
      { text: "No (0)", code: "no" },
      { text: "Do not know or not done", code: "don't know" }
    ];
    let value = [items[1].code, items[2].code];
</script>


<Card>
<CardBody>
    <dev style="font-size: 18px; font-weight: bold;">Naranjo algorithm</dev>
</CardBody>
    
<CardBody>
<FormCheckboxGroup label="1. Are there previous conclusive reports on this reaction?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="2. Did the adverse events appear after the suspected drug was given?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="3. Did the adverse reaction improve when the drug was discontinued or a specific antagonist was given?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="4. Did the adverse reaction appear when the drug was re administered?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="5. Are there alternative causes that could have caused the reaction?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="6. Did the reaction reappear when a placebo was given?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="7. Was the drug detected in any body fluid in toxic concentrations?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="8. Was the reaction more severe when the dose was increased, or less severe when the dose was decreased?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="9. Did the patient have a similar reaction to the same or similar drugs in any previous exposure?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

<FormCheckboxGroup label="10. Was the adverse event confirmed by any objective evidence?" bind:value {items} let:item let:index>
    {(index || 0) + 1}. {item.text}
</FormCheckboxGroup>

</CardBody>
</Card>

<!-- <i>value: {JSON.stringify(value)}</i> -->