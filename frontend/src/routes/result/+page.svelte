<script>
	import {
	  El,
	  Button, 
	  Modal, ModalBody, ModalFooter
	} from 'yesvelte'
  
	import { onMount } from 'svelte';
	import DrugChart from '../../lib/DrugChart.svelte';
	import { groupedPatientData } from '$lib/stores';
  
	let show = false;
	let patients = [];
	let selectedPatient = null;
	let patientData = {};
  
	onMount(() => {
	  // Get groupedPatientData from the store
	  groupedPatientData.subscribe(data => {
		patients = Object.keys(data);
		patientData = data;
	  });
	});
  
	function selectPatient(patientNum) {
	  selectedPatient = patientNum;
	  console.log('Selected Patient:', selectedPatient);
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
		  {#each patients as patientNum}
			<button on:click={() => selectPatient(patientNum)}>
			  Patient {patientNum}
			</button>
		  {/each}
		</div>
		<div class="scroll-container">
		  {#if selectedPatient !== null}
			<DrugChart {selectedPatient} {patientData} />
		  {:else}
			<p>Please select a patient to view their data.</p>
		  {/if}
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
	  <Button color="primary" on:click={() => (show = false)}>Checked</Button>
	</ModalFooter>
  </Modal>
  