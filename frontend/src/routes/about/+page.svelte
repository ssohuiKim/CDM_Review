<script>
  import { goto } from '$app/navigation';
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
    Divider
	} from 'yesvelte'
</script>

<Card>
	<Tabs>
		<CardHeader>
			<TabList grow>
				<TabItem active>Data Acquisition</TabItem>
				<TabItem>Tool Guide</TabItem>
			</TabList>
		</CardHeader>
		<CardBody>
			<TabContent>
				<TabPanel>
          <El container m="0" p="4">
            <El row tag="h1">*️⃣ How to Extract CDM Data</El>

            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 20px;">
              This guide explains how to extract ICI hepatotoxicity patient data from your OMOP CDM database for use with DILI-Assist.
            </El>

            <!-- Prerequisites -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">📋 Prerequisites</El>
            <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
              <li>Access to your institution's OMOP CDM database</li>
              <li>DBeaver or equivalent SQL client installed</li>
              <li>Permission to query patient data</li>
            </El>

            <!-- Step 1: Download Query -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">Step 1: Download Query File</El>
            <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px;">
              Download the SQL query file that extracts ICI-treated patients with hepatotoxicity events.
            </El>
            <El row style="margin-top: 15px;">
              <a href="/Query_ICI_Hepatotoxicity_Webtool_250923.txt" download style="display: inline-flex; align-items: center; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
                📥 Download Query File
              </a>
            </El>

            <!-- Step 2: Execute Query -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">Step 2: Execute Query in DBeaver</El>
            <El row tag="ol" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
              <li>Open DBeaver and connect to your CDM database</li>
              <li>Open the downloaded query file (File → Open File)</li>
              <li>Modify the database/schema name if necessary to match your environment</li>
              <li>Execute the query (Ctrl + Enter or click the Execute button)</li>
            </El>

            <!-- Step 3: Export Results -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">Step 3: Export Results</El>
            <El row tag="ol" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
              <li>Right-click on the query results</li>
              <li>Select "Export Data" → "Export to File"</li>
              <li>Choose format: <strong>TSV (Tab-Separated Values)</strong></li>
              <li>Set encoding to <strong>UTF-8</strong></li>
              <li>Save as <strong>.txt</strong> file</li>
            </El>

            <!-- Output Format Requirements -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">📄 Output Format Requirements</El>
            <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px;">
              The exported file must meet the following requirements:
            </El>
            <El row style="margin-top: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="background-color: #f1f5f9;">
                  <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Item</th>
                  <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Requirement</th>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">File Format</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">TSV (Tab-Separated Values) with .txt extension</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Encoding</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">UTF-8</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Header Row</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Required (first row must contain column names)</td>
                </tr>
              </table>
            </El>

            <!-- Required Columns -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">📊 Required Columns</El>
            <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px;">
              The query output includes the following essential columns:
            </El>
            <El row style="margin-top: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="background-color: #f1f5f9;">
                  <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Column Name</th>
                  <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Description</th>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">patient_no</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Unique patient identifier</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">gender_source_value</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Patient gender</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">age</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Patient age</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">new_drug_exposure_date</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Date of drug exposure</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">day_num</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Day number in treatment timeline</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">drug_concept_id</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">OMOP drug concept identifier</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">drug_name</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Name of the administered drug</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">drug_name_dose</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Drug name with dosage information</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">ICI_lasting</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">ICI drug effect duration indicator</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">measurement_date</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Date of laboratory measurement</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">grade</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Hepatotoxicity severity grade (0-4)</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">diagnosis_group</td>
                  <td style="border: 1px solid #e2e8f0; padding: 10px;">Drug hepatotoxicity classification (toxic/safe)</td>
                </tr>
              </table>
            </El>

            <!-- Data Description -->
            <El row tag="h3" style="margin-top: 30px; color: #1e40af;">🎯 Extracted Data</El>
            <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
              The query extracts patients who:
            </El>
            <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
              <li>Received immune checkpoint inhibitor (ICI) therapy (Atezolizumab, Nivolumab, Pembrolizumab, Ipilimumab)</li>
              <li>Developed hepatotoxicity events during or after treatment</li>
              <li>Have complete drug exposure and laboratory data available</li>
            </El>

          </El>

        </TabPanel>
				<TabPanel>

          <El container m="0" p="4">
            <El row tag="h1">*️⃣ How to use DILI-Assist </El>
            <img src="/about/1.png" alt="input page" style="width: 85%; height: auto; margin-top: 45px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
              ① Click the file upload area or drag and drop to select CDM data in TXT, CSV, or TSV format. The system will automatically detect the file format.
            </El>

            <img src="/about/2.png" alt="input page" style="width: 85%; height: auto; margin-top: 45px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
              ② When you select a file, the detected format and file name will be displayed with a confidence score. <br />
              ③ If the correct format has been detected, click the Upload button to navigate to the result page.
            </El>

            <img src="/about/3.png" alt="result page" style="width: 85%; height: auto; margin-top: 5px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
              ④ When the result page appears, select the patient you want to view from the patient list on the left.<br />
              ⑤ The Naranjo Algorithm is a survey tool that verifies whether ICI medications cause hepatotoxicity. It confirms causality through 10 questions. Select the answer that matches your assessment for each question.<br />
              ⑥ Click the 'Analyze with AI' button to see AI-generated Naranjo survey responses based on patient data.
            </El>

            <img src="/about/4.png" alt="survey page" style="width: 85%; height: auto; margin-top: 45px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
              ⑦ AI-selected answers are marked with an 'AI' badge on the right side of the answer.<br />
              ⑧ Click the '?' icon next to each question to view the AI's reasoning and confidence level.<br />
              ⑨ The Naranjo score is automatically calculated based on your selections.<br />
              ⑩ Click the Submit button to save your responses and notes, which will be included in downloaded reports.
            </El>

            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
              ⑪ Click 'Export This Data' to download the currently selected patient's chart and Naranjo survey results as an HTML file.<br />
              ⑫ Click 'Export All Data' to download HTML files for all patients as a ZIP file.<br />
              ⑬ Click the icon at the bottom left to open the PubMed literature search assistant.
            </El>
          </El>

        </TabPanel>
			</TabContent>
		</CardBody>
	</Tabs>
</Card>
