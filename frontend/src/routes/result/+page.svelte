<script>
	import {
	  El,
	  Button,
	  Modal, ModalBody, ModalFooter,
	  Spinner
	} from 'yesvelte';
	import { onMount } from 'svelte';
	import DrugChart from '../../lib/DrugChart.svelte';
	import AxisChart from '../../lib/axisChart.svelte';
	import HoverBox from '../../lib/hover.svelte';
	import Survey from '../../lib/survey.svelte';
	import { groupedPatientData } from '$lib/duckdb';
	import html2canvas from 'html2canvas';
	import JSZip from 'jszip';
	import pkg from 'file-saver';
	const { saveAs } = pkg;
  
	let show = false;
	let showLoading = false; // 로딩 모달 상태
	let patients = [];
	let selectedPatient = null;
	let patientData = {};
	let surveyRef;
  
	onMount(() => {
	  groupedPatientData.subscribe(data => {
		patients = Object.keys(data);
		patientData = data;
	  });
	});
  
	function selectPatient(patientNum) {
		selectedPatient = patientNum;
		if (surveyRef && typeof surveyRef.reset === "function") {
			surveyRef.reset(); // 설문 상태 초기화
		}
		console.log("Selected Patient:", selectedPatient);
	}
  
	async function downloadAllCharts() {
		showLoading = true; // 로딩 모달 표시
		const zip = new JSZip();
		
		for (const patientNum of patients) {
			const chartContainer = document.createElement('div');
			const surveyContainer = document.createElement('div');

			chartContainer.style.position = 'absolute';
			chartContainer.style.left = '-9999px'; // 화면에서 숨김
			document.body.appendChild(chartContainer);

			surveyContainer.style.position = 'absolute';
			surveyContainer.style.left = '-9999px'; // 화면에서 숨김
			document.body.appendChild(surveyContainer);

			// 🟢 DrugChart 컴포넌트 렌더링
			const chart = new DrugChart({
				target: chartContainer,
				props: { selectedPatient: patientNum, patientData }
			});

			// 🟢 Survey 컴포넌트 렌더링
			const survey = new Survey({
				target: surveyContainer,
				props: { selectedPatient: patientNum, patientData }
			});

			await new Promise(resolve => setTimeout(resolve, 500)); // 렌더링 대기

			// DrugChart 캡처
			const canvas = chartContainer.querySelector('canvas');
			let chartContent = "";

			if (canvas) {
				const imgData = canvas.toDataURL('image/png');
				chartContent = `<img src="${imgData}" alt="Patient ${patientNum} Drug Chart">`;
			}

			// Survey를 html2canvas로 캡처하여 이미지로 저장
			let surveyContent = "";
			try {
				const surveyCanvas = await html2canvas(surveyContainer);
				const surveyImgData = surveyCanvas.toDataURL('image/png');
				surveyContent = `<img src="${surveyImgData}" alt="Patient ${patientNum} Survey Results">`;
			} catch (error) {
				console.error('Survey 캡처 오류:', error);
			}

			// HTML 파일 생성
			const htmlContent = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<title>Patient ${patientNum} Report</title>
					<style>${document.querySelector('style')?.innerHTML || ''}</style>
				</head>
				<body>
					<h1>Patient ${patientNum} Report</h1>
					<h2>Drug Chart</h2>
					${chartContent}
					<h2>Survey Results</h2>
					${surveyContent}
				</body>
				</html>
			`;

			zip.file(`patient-${patientNum}-report.html`, htmlContent);

			// 정리
			chart.$destroy();
			survey.$destroy();
			document.body.removeChild(chartContainer);
			document.body.removeChild(surveyContainer);
		}

		// ZIP 파일 저장
		const content = await zip.generateAsync({ type: 'blob' });
		saveAs(content, 'patient-reports.zip');
		showLoading = false; // 로딩 모달 숨김
	}


	let isRowScrolled = false;
	let isColScrolled = false;
  
	function handleScroll(event) {
		const scrollContainer = event.target;
		const fixedRow = scrollContainer.querySelector('.fixed-row');
		const fixedCol = scrollContainer.querySelector('.fixed-col');

		const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight; // 최대 스크롤 값
		const scrolledX = scrollContainer.scrollLeft > 0;
  		const scrolledY = scrollContainer.scrollTop < maxScrollTop;

		isRowScrolled = scrolledY;
		isColScrolled = scrolledX;
  
		if (fixedRow) {
			// 스크롤에 따라 하단 축 Y 이동 (예: scrollTop 만큼 translateY)
			fixedRow.style.transform = `translateY(${scrollContainer.scrollTop}px)`;
		}
		if (fixedCol) {
			// 스크롤에 따라 좌측 축 X 이동 (예: scrollLeft 만큼 translateX)
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
		border: 1px solid #DCE0E5;
		padding: 16px;
		display: flex;
		flex-direction: row;
		height: 100%;
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
		border: 0;
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
	/* 기존 canvas-container 스타일 대신 오버랩 컨테이너 사용 */
	.canvas-container {
		position: relative;
		width: 100%;
		height: 100%;
		/* DrugChart와 HoverBox는 이 영역 안에서 겹쳐서 표시됩니다. */
	}
	.overlap {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
	.fixed-col {
		position: absolute;
		top: 0;
		left: 1px;
		width: 120px; 
		height: 100%;
		pointer-events: none;
		z-index: 2;
		background-color: rgb(255, 255, 255, 0.5);
	}
	.fixed-row {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 60px;
		pointer-events: none;
		z-index: 1;
		background-color: rgb(255, 255, 255, 0.5);
	}
	.survey {
		width: 335px;
		background-color: white;
		border: 1px solid #dcdcdc;
		border-radius: 8px;
		padding: 16px;
		margin-left: 15px;
		height: calc(100vh - 300px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
		flex-shrink: 0;
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
	.text-button {
		background: #216BC4;
		border: none;
		font-size: 14px;
		padding: 8px 16px;
		color: white;
		width: 120px;
		height: 36px;
		font-weight: bold;
		border-radius: 6px;
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
  
	<El row style="margin-top: 24px; height: 100%;">
		<div class="card">
			<!-- 좌측 환자 목록 -->
			<div class="sidebar">
				{#each patients as patientNum}
					<button on:click={() => selectPatient(patientNum)}>
						Patient {patientNum}
					</button>
				{/each}
			</div>
	
			<!-- 중앙 영역: 스크롤 컨테이너 -->
			<div class="scroll-container" on:scroll={handleScroll}>
				<div class="canvas-container">
					{#if selectedPatient !== null}
						<!-- DrugChart와 HoverBox를 각각 overlap 클래스를 가진 컨테이너로 감싸서 겹치게 함 -->
						<div class="overlap">
							<DrugChart {selectedPatient} {patientData} />
						</div>
						<div class="overlap">
							<HoverBox {selectedPatient} {patientData} />
						</div>
					{:else}
						<p>Please select a patient to view their data.</p>
					{/if}
				</div>
				<!-- 좌측 고정 축 (col) -->
				{#if isColScrolled}
					<div class="fixed-col">
						<AxisChart type="col" {selectedPatient} {patientData} />
					</div>
				{/if}
				{#if isRowScrolled}
					<!-- 하단 고정 축 (row) -->
					<div class="fixed-row">
						<AxisChart type="row" {selectedPatient} {patientData} />
					</div>
				{/if}
			</div>
	
			<!-- 오른쪽 Survey 영역 -->
			<div class="survey">
				<Survey bind:this={surveyRef} {selectedPatient} {patientData} />
			</div>
		</div>
	</El>
  
	{#if showLoading}
		<div class="loading-modal">
			<div class="loading-content">
				<p>Downloading charts, please wait...</p>
				<Spinner color="dark" />
			</div>
		</div>
	{/if}
</El>

<Modal title="Hepatotoxic Drug" bind:show>
	<ModalBody>
		Currently, hepatotoxic drugs are classified according to the National Library of Medicine (NIH)'s Master List of LiverTox Drugs (October 2023).
		<br /><br />
		LiverTox: Clinical and Research Information on Drug-Induced Liver Injury [Internet]. Bethesda (MD): National Institute of Diabetes and Digestive and Kidney Diseases; 2012-. Master List of LiverTox Drugs. [Updated 2023 Feb 10].
		<br /><br />
		Available from: <a target="_blank" href="https://www.ncbi.nlm.nih.gov/books/NBK571102/">here</a>
	</ModalBody>
	<ModalFooter>
		<Button color="primary" on:click={() => (show = false)}>Checked</Button>
	</ModalFooter>
</Modal>
