<script>
	import {
		TabList,
		TabItem,
		TabContent,
		TabPanel,
		Tabs,
		Card,
		CardHeader,
		CardBody,
		El,
		Button, 
		Modal, ModalBody, ModalFooter
	} from 'yesvelte'
    import DrugChart from '../../lib/DrugChart.svelte'

	let show = false;
</script>

<style>
    .img-button {
        background: none;
        border: none;
        cursor: pointer;
    }

    .img-button img {
        width: 20px; 
        height: 20px; 
    }
</style>

<El container m="0" p="4">
	<El row alignItems="start" p="0" m="0">
		<El col='auto' tag="h1" p="0" m="0">Results</El>
		<El col='auto' alignSelf="center">
			<button class="img-button" on:click={() => (show = !show)}>
				<img src="/tooltip.svg" alt="Tooltip Icon">
			</button>
		</El>
	</El>
	<El row style="margin-top: 24px;">
		<Card>
			<Tabs>
				<CardHeader>
					<TabList>
						<TabItem active>Home</TabItem>
						<TabItem>Profile</TabItem>
					</TabList>
				</CardHeader>
				<CardBody>
					<TabContent>
						<TabPanel>
							<DrugChart />
						</TabPanel>
						<TabPanel>
							<h4>Profile tab</h4>
							Here is the content of the second tab.
						</TabPanel>
					</TabContent>
				</CardBody>
			</Tabs>
		</Card>
	</El>
</El>

<Modal title="Hepatotoxic Drug" bind:show>
	<ModalBody>
		Currently, hepatotoxic drugs are classified according to the National Library of Medicine (NIH)'s Master List of LiverTox Drugs (October 2023).
		<br><br>
		LiverTox: Clinical and Research Information on Drug-Induced Liver Injury [Internet]. Bethesda (MD): National Institute of Diabetes and Digestive and Kidney Diseases; 2012-. Master List of LiverTox Drugs. [Updated 2023 Feb 10]. 
		<br><br>
		Available from: <a target="_blank" href="https://www.ncbi.nlm.nih.gov/books/NBK571102/">here</a>
	</ModalBody>
	<ModalFooter>
		<!-- <Button me="auto" on:click={() => (show = false)}>Close</Button> -->
		<Button color="primary" on:click={() => (show = false)}>Checked</Button>
	</ModalFooter>
</Modal>