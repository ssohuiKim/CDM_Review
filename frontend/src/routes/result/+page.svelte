<script>
	import {
	  El,
	  Button,
	  Modal, ModalBody, ModalFooter
	} from 'yesvelte';
	import { onMount } from 'svelte';
	import DrugChart from '../../lib/DrugChart.svelte';
	import AxisChart from '../../lib/axisChart.svelte';
	import { groupedPatientData } from '$lib/stores';
	import html2canvas from 'html2canvas';
	import JSZip from 'jszip';
	import pkg from 'file-saver';
	const { saveAs } = pkg;
  
	let show = false;
	let showLoading = false; // 로딩 모달 상태
	let patients = [];
	let selectedPatient = null;
	let patientData = {};
  
	onMount(() => {
	  groupedPatientData.subscribe(data => {
		patients = Object.keys(data);
		patientData = data;
	  });
	});
  
	function selectPatient(patientNum) {
	  selectedPatient = patientNum;
	  console.log('Selected Patient:', selectedPatient);
	}
  
	async function downloadAllCharts() {
	  showLoading = true; // 다운로드 시작 시 로딩 모달 표시
	  const zip = new JSZip();
	  for (const patientNum of patients) {
		const chartContainer = document.createElement('div');
		chartContainer.style.position = 'absolute';
		chartContainer.style.left = '-9999px'; // 화면에서 보이지 않도록 함
		document.body.appendChild(chartContainer);
  
		const chart = new DrugChart({
		  target: chartContainer,
		  props: { selectedPatient: patientNum, patientData }
		});
  
		await new Promise(resolve => setTimeout(resolve, 500)); // 차트가 렌더링될 시간을 기다림
  
		const canvas = chartContainer.querySelector('canvas');
		const dataUrl = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));
  
		zip.file(`patient-${patientNum}.png`, dataUrl.split(',')[1], { base64: true });
		chart.$destroy();
		document.body.removeChild(chartContainer);
	  }
  
	  const content = await zip.generateAsync({ type: 'blob' });
	  saveAs(content, 'charts.zip');
	  showLoading = false; // 다운로드 완료 시 로딩 모달 숨기기
	}
  
	function handleScroll(event) {
	  const scrollContainer = event.target;
	  const fixedRow = scrollContainer.querySelector('.fixed-row');
	  const fixedCol = scrollContainer.querySelector('.fixed-col');
  
	  if (fixedRow) {
		fixedRow.style.transform = `translateY(${scrollContainer.scrollTop}px)`;
	  }
	  if (fixedCol) {
		fixedCol.style.transform = `translateX(${scrollContainer.scrollLeft}px)`;
	  }
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
	  position: relative;
	  flex: 1;
	  overflow: auto;
	}
  
	.fixed-row {
	  position: absolute;
	  bottom: 0;
	  left: 190px;
	  z-index: 1;
	  pointer-events: none;
	  background-color: rgba(22, 3, 3, 0.3);
	}
  
	.fixed-col {
	  position: absolute;
	  top: 48px;
	  left: 0;
	  z-index: 2;  /* column이 날짜 행보다 위에 덮여짐 */
	  pointer-events: none;
	  background-color: rgba(22, 3, 3, 0.3);
	}
  
	.text-button {
	  background: #216BC4;
	  border: none;
	  font-size: 14px;
	  padding: 8px 16px 8px 16px;
	  color: white;
	  width: 120px;
	  height: 36px;
	  font-weight: bold;
	  border-radius: 6px;
	  top: 50%;
	}
  
	.header {
	  display: flex;
	  align-items: center;
	  justify-content: space-between;
	  width: 100%;
	}
  
	.header-title {
	  display: flex;
	  align-items: center;
	}
  
	.loading-modal {
	  display: flex;
	  justify-content: center;
	  align-items: center;
	  position: fixed;
	  top: 0;
	  left: 0;
	  width: 100%;
	  height: 100%;
	  /* 투명도 50% */
	  background: rgba(0, 0, 0, 0.5);
	  z-index: 9999;
	}
  
	.loading-content {
	  background: white;
	  padding: 20px;
	  border-radius: 5px;
	  text-align: center;
	}
  </style>
  
  <El container m="0" p="4" style="height: 100%;">
	<div class="header">
	  <div class="header-title">
		<h1>Results</h1>
		<button class="img-button" on:click={() => (show = !show)}>
		  <img src="/tooltip.svg" alt="Tooltip Icon">
		</button>
	  </div>
	  <button class="text-button" on:click={downloadAllCharts}>
		Export Data
	  </button>
	</div>
  
	<El row style="margin-top: 24px; height: 100%">
	  <div class="card">
		<div class="sidebar">
		  {#each patients as patientNum}
		  <button on:click={() => selectPatient(patientNum)}>
			Patient {patientNum}
		  </button>
		  {/each}
		</div>
		<div class="scroll-container" on:scroll={handleScroll}>
		  {#if selectedPatient !== null}
			<div class="fixed-row">
			  <AxisChart type="row" {selectedPatient} {patientData} />
			</div>
			<div class="fixed-col">
			  <AxisChart type="col" {selectedPatient} {patientData} />
			</div>
			<DrugChart {selectedPatient} {patientData} />
		  {:else}
			<p>Please select a patient to view their data.</p>
		  {/if}
		</div>
	  </div>
	</El>
  
	{#if showLoading}
	<div class="loading-modal">
	  <div class="loading-content">
		<p>Downloading charts, please wait...</p>
	  </div>
	</div>
	{/if}
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
  