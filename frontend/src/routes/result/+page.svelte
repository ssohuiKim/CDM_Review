<script>
	import {
		Card,
		CardBody,
		El,
		Button, 
		Modal, ModalBody, ModalFooter
	} from 'yesvelte'
    import DrugChart from '../../lib/DrugChart.svelte'
	import { writable } from 'svelte/store';
	import { patientNos } from '../../lib/stores';

	let show = false;
	const selectedPatient = writable(patientNos[0]); // 초기 선택 환자

	// 선택된 환자 변경 함수
	function selectPatient(patientNo) {
		selectedPatient.set(patientNo);
	}
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

	.card {
		background-color: white;
		border-radius: 4px;
		border-width: 1px;
		border-color: #DCE0E5;
		border-style: solid; 
		padding: 16px;
		display: flex;
		flex-direction: row;
		height: 100%;
		overflow: auto;
	}

	.sidebar {
		border-right: 1px solid #dcdcdc;
		width: 150px;
		overflow: auto;
		padding-right: 12px;
		flex-shrink: 0;
	}

	.sidebar button {
		display: block;
		width: 100%;
		margin-bottom: 8px;
		padding: 8px;
		background-color: white;
		border: 0px;
		text-align: left;
		cursor: pointer;
	}

	.sidebar button:hover {
		background-color: #e0e0e0;
	}
	
	.scroll-container {
		flex: 1;
		overflow: auto;
	}
</style>

<El container m="0" p="4" style="height: 100%;">
	<El row alignItems="start" p="0" m="0">
		<El col='auto' tag="h1" p="0" m="0">Results</El>
		<El col='auto' alignSelf="center">
			<button class="img-button" on:click={() => (show = !show)}>
				<img src="/tooltip.svg" alt="Tooltip Icon">
			</button>
		</El>
	</El>
	<El row style="margin-top: 24px; height: 100%">
		<div class="card">
			<div class="sidebar">
				{#each patientNos as patientNo}
					<button on:click={() => selectPatient(patientNo)}>
						Patient {patientNo}
					</button>
				{/each}
			</div>
			<div class="scroll-container">
				<DrugChart {selectedPatient} />
			</div>
		</div>
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
