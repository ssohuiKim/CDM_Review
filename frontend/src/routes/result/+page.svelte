<script>
	import {
	  El,
	  Button,
	  Modal, ModalBody, ModalFooter,
	  Spinner
	} from 'yesvelte';
	import { onMount, tick } from 'svelte';
	import DrugChart from '../../lib/DrugChart.svelte';
	import AxisChart from '../../lib/axisChart.svelte';
	import HoverBox from '../../lib/hover.svelte';
	import Survey from '../../lib/survey.svelte';
	// 챗봇 컴포넌트 추가
	import CircularChatButton from '../../lib/chatbot/CircularChatButton.svelte';
	import ChatBot from '../../lib/chatbot/ChatBot.svelte';
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
	
	// 챗봇 상태 추가
	let isChatOpen = false;
  
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

	async function createHiddenContainer() {
		const container = document.createElement('div');
		container.style.position = 'absolute';
		container.style.left = '-9999px'; // 화면에서 숨김
		document.body.appendChild(container);
		return container;
	}

	async function captureChart(chartContainer) {
		const canvas = chartContainer.querySelector('canvas');
		if (canvas) {
			return `<img src="${canvas.toDataURL('image/png')}" alt="Drug Chart">`;
		}
		return "";
	}

	// async function captureSurvey(surveyContainer) {
	// 	try {
	// 		const surveyCanvas = await html2canvas(surveyContainer);
	// 		return `<img src="${surveyCanvas.toDataURL('image/png')}" alt="Survey Results">`;
	// 	} catch (error) {
	// 		console.error("Survey 캡처 오류:", error);
	// 		return "<p>Survey data unavailable</p>";
	// 	}
	// }

	function generateSurveyHTML(patientNum) {
		const storedData = JSON.parse(localStorage.getItem('naranjoAlgorithmData') || "{}");
		const data = storedData[patientNum];

		if (!data) return "<p>No survey data available.</p>";

		const questions = [
			"Are there previous conclusive reports on this reaction?",
			"Did the adverse events appear after the suspected drug was given?",
			"Did the adverse reaction improve when the drug was discontinued or a specific antagonist was given?",
			"Did the adverse reaction appear when the drug was re-administered?",
			"Are there alternative causes that could have caused the reaction?",
			"Did the reaction reappear when a placebo was given?",
			"Was the drug detected in any body fluid in toxic concentrations?",
			"Was the reaction more severe when the dose was increased, or less severe when the dose was decreased?",
			"Did the patient have a similar reaction to the same or similar drugs in any previous exposure?",
			"Was the adverse event confirmed by any objective evidence?"
		];

		let result = `<div class="survey-box">`;

		questions.forEach((q, i) => {
			const qKey = `q${i + 1}`;
			const answer = data.answers?.[qKey]?.[0] ?? "Not answered";
			result += `
				<div class="question-block">
					<p class="question"><strong>${i + 1}. ${q}</strong></p>
					<p class="answer">${answer}</p>
				</div>
			`;
		});

		result += `<div class="score">Total Score: ${data.totalScore}</div>`;
		result += `<div class="note">Note: ${data.note ?? ""}</div>`;
		result += `</div>`;

		return result;
}


	async function generateReportHTML(patientNum, patientData) {
    const chartContainer = await createHiddenContainer();
    const surveyContainer = await createHiddenContainer();

    const chart = new DrugChart({ target: chartContainer, props: { selectedPatient: patientNum, patientData } });
    const survey = new Survey({ target: surveyContainer, props: { selectedPatient: patientNum, patientData } });

	await tick();
	await new Promise(resolve => setTimeout(resolve, 300)); 



    const chartContent = await captureChart(chartContainer);
    // const surveyContent = await captureSurvey(surveyContainer);
	const surveyContent = generateSurveyHTML(patientNum);

    chart.$destroy();
    survey.$destroy();
    document.body.removeChild(chartContainer);
    document.body.removeChild(surveyContainer);

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Patient ${patientNum} Report</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4;
                    display: flex; /* Flexbox를 사용하여 좌측 사이드바와 우측 콘텐츠 배열 */
                    min-height: 100vh; /* 뷰포트 전체 높이 사용 */
                    flex-direction: column; /* 제목과 컨테이너 분리 */
                }
                h1 { 
                    color: #2c3e50; 
                    padding: 20px;
                    margin-bottom: 0; 
                    background-color: #fff;
                    border-bottom: 1px solid #eee;
                    text-align: center; /* 제목 중앙 정렬 */
                }
				
                .report-wrapper {
                    display: flex;
                    flex: 1; /* 남은 공간 모두 차지 */
                    width: 100%;
                }
                .sidebar-tabs {
                    width: 200px;
                    background-color: #2d2d2d;
                    color: white;
                    padding-top: 20px;
                    box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                    flex-shrink: 0; 
                    overflow-y: auto; /* 탭이 많아질 경우 스크롤 */
                }
                .tab-button {
                    display: block;
                    width: 100%;
                    padding: 15px 20px;
                    text-align: left;
                    background-color: #333;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    transition: background-color 0.3s ease;
                }
                .tab-button:hover {
                    background-color: #555;
                }
                .tab-button.active {
                    background-color: #007bff; /* 활성화된 탭 색상 */
                    font-weight: bold;
                }
                .content-area {
                    flex: 1; /* 남은 공간 차지 */
                    padding: 20px;
                    background-color: #fff;
                    overflow-y: auto; /* 내용이 길어지면 스크롤바 생성 */
                    box-shadow: -2px 0 5px rgba(0,0,0,0.05); /* 사이드바와 콘텐츠 영역 경계 그림자 */
                }
                .tab-content {
                    display: none; /* 기본적으로 모든 탭 콘텐츠 숨김 */
                }
                .tab-content.active {
                    display: block; /* 활성화된 탭 콘텐츠만 보임 */
                }
                .section-title {
                    color: #2c3e50; 
                    border-bottom: 2px solid #eee; 
                    padding-bottom: 10px; 
                    margin-top: 0; 
                    margin-bottom: 20px;
                }
                img { 
                    max-width: 100%; 
                    height: auto; 
                    display: block; 
                    margin: 0 auto; 
                    border: 1px solid #ccc; 
                    padding: 5px; 
                    background-color: white; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08); 
                }
				.survey-box {
					background: #f9f9f9;
					border: 1px solid #ddd;
					border-radius: 8px;
					padding: 20px;
					font-size: 15px;
					}
					.question-block {
					margin-bottom: 24px;
					padding-bottom: 16px;
					border-bottom: 1px solid #e0e0e0;
					}
					.question {
					margin: 0 0 4px 0;
					}
					.answer {
					color: #1d4ed8;
					font-weight: 500;
					margin: 0;
					}
					.score, .note {
					margin-top: 12px;
					font-style: italic;
					color: #555;
					}
                p { margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h1>Patient ${patientNum} Report</h1>
            <div class="report-wrapper">
                <div class="sidebar-tabs">
                    <button class="tab-button active" onclick="openTab(event, 'DrugChart')">Drug Chart</button>
                    <button class="tab-button" onclick="openTab(event, 'SurveyResults')">Survey Results</button>
                </div>

                <div class="content-area">
                    <div id="DrugChart" class="tab-content active">
                        <h2 class="section-title">Drug Chart</h2>
                        ${chartContent}
                    </div>
                    <div id="SurveyResults" class="tab-content">
                        <h2 class="section-title">Survey Results</h2>
                        ${surveyContent}
                    </div>
                </div>
            </div>

            <script>
                function openTab(evt, tabName) {
					console.log("Opening tab:", tabName);


                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tab-content");
                    for (i = 0; i < tabcontent.length; i++) {
                        tabcontent[i].style.display = "none";
                        tabcontent[i].classList.remove('active');
                    }

                    tablinks = document.getElementsByClassName("tab-button");
                    for (i = 0; i < tablinks.length; i++) {
                        tablinks[i].classList.remove("active");
                    }

                    document.getElementById(tabName).style.display = "block";
                    document.getElementById(tabName).classList.add('active');
                    evt.currentTarget.classList.add("active");
                }

                document.addEventListener('DOMContentLoaded', (event) => {
                    document.querySelector('.tab-button.active')?.click(); 
                });
            </script\x3E </body>
        </html>
    `;
	}



	function saveHTMLFile(filename, content) {
		const blob = new Blob([content], { type: 'text/html' });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	async function downloadOneChart() {
		if (!selectedPatient) {
			alert("Please select a patient first.");
			return;
		}
		showLoading = true;

		if (surveyRef && typeof surveyRef.saveToLocalStorage === 'function') {
			surveyRef.saveToLocalStorage();  // 수동 저장
			await tick();                    // 렌더링 완료까지 대기
			await new Promise(resolve => setTimeout(resolve, 300));
		}


		const htmlContent = await generateReportHTML(selectedPatient, patientData);
		saveHTMLFile(`patient-${selectedPatient}-report.html`, htmlContent);
		showLoading = false;
	}

	async function downloadAllCharts() {
		showLoading = true;
		const zip = new JSZip();

		for (const patientNum of patients) {
			const htmlContent = await generateReportHTML(patientNum, patientData);
			zip.file(`patient-${patientNum}-report.html`, htmlContent);
		}

		const zipContent = await zip.generateAsync({ type: 'blob' });
		saveAs(zipContent, "patient-reports.zip");
		showLoading = false;
	}



	let isRowScrolled = false;
	let isColScrolled = false;
	let dynamicMarginRight = 120; // DrugChart에서 받아올 값
	let minWidth = 550; // DrugChart에서 받아올 최소 너비 값
  
	function handleScroll(event) {
		const scrollContainer = event.target;
		const fixedRow = scrollContainer.querySelector('.fixed-row');
		const fixedCol = scrollContainer.querySelector('.fixed-col');

		const EPS = 3; // 오차 범위 허용 (픽셀)
		const scrolledX = scrollContainer.scrollLeft > 0;
		
		// 바닥 판정 개선: scrollTop + clientHeight >= scrollHeight - EPS
		const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - EPS;
		const scrolledY = !isAtBottom; // 바닥에 도달하지 않았을 때만 true

		isRowScrolled = scrolledY;
		isColScrolled = scrolledX;
  
		if (fixedRow) {
			// 스크롤에 따라 하단 축 Y 이동 (예: scrollTop 만큼 translateY)
			fixedRow.style.transform = `translateY(${scrollContainer.scrollTop}px)`;
		}
		if (fixedCol) {
			// 스크롤에 따라 좌측 축 X 이동 (예: scrollLeft 만큼 translateX)
			fixedCol.style.transform = `translateX(${scrollContainer.scrollLeft}px)`;
			
			// 차트의 실제 높이에 맞춰 fixed-col 높이 조정
			const canvasContainer = scrollContainer.querySelector('.canvas-container');
			if (canvasContainer) {
				const actualHeight = Math.max(canvasContainer.scrollHeight, scrollContainer.scrollHeight);
				fixedCol.style.height = `${actualHeight}px`;
			}
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
		/* width는 인라인 스타일로 동적 설정됨 */
		min-width: 120px; /* 최소 너비 보장 */
		height: auto; /* 컨테이너 높이에 맞춤 */
		min-height: 100vh; /* 최소 높이 보장 */
		pointer-events: none;
		z-index: 2;
		background-color: rgba(255, 255, 255, 0.8);
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
		width: 135px;
		height: 36px;
		font-weight: bold;
		border-radius: 6px;
		white-space: nowrap;
	}
	.download-button {
		background: #a3a3a3;
		border: none;
		font-size: 14px;
		padding: 8px 10px;
		color: white;
		width: 140px;
		height: 36px;
		font-weight: bold;
		border-radius: 6px;
		white-space: nowrap;
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

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between; /* 왼쪽 h1, 오른쪽 버튼 정렬 */
		width: 100%;
	}

	.button-group {
		display: flex;
		gap: 8px; /* 버튼 간격 설정 */
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
		<!-- 버튼을 감싸는 div 추가 -->
		<div class="button-group">
			<button class="download-button" on:click={downloadOneChart}>
				Export This Data
			</button>
			<button class="text-button" on:click={downloadAllCharts}>
				Export All Data
			</button>
		</div>
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
				<div class="canvas-container" style="min-width: {minWidth}px;">
					{#if selectedPatient !== null}
						<!-- DrugChart와 HoverBox를 각각 overlap 클래스를 가진 컨테이너로 감싸서 겹치게 함 -->
						<div class="overlap">
							<!-- <DrugChart bind:dynamicMarginRight bind:minWidth {selectedPatient} {patientData} /> -->
						</div>
						<div class="overlap">
							<HoverBox {selectedPatient} {patientData} {minWidth} />
						</div>
					{:else}
						<p>Please select a patient to view their data.</p>
					{/if}
				</div>
				<!-- 좌측 고정 축 (col) -->
				{#if isColScrolled}
					<div class="fixed-col" style="width: {dynamicMarginRight}px;">
						<AxisChart type="col" {selectedPatient} {patientData} {minWidth} />
					</div>
				{/if}
				{#if isRowScrolled}
					<!-- 하단 고정 축 (row) -->
					<div class="fixed-row">
						<AxisChart type="row" {selectedPatient} {patientData} {minWidth} />
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

<!-- 챗봇 UI 추가 -->
<CircularChatButton bind:isOpen={isChatOpen} on:toggle={(event) => isChatOpen = event.detail.isOpen} />
<ChatBot bind:isOpen={isChatOpen} />