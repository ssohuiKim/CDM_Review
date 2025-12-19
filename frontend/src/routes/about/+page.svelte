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
              1️⃣ Click the 'Choose File' button to select CDM data in a .txt file with TSV format. If an error message appears, please check whether the selected file matches the required format.
            </El>
            
            <img src="/about/2.png" alt="input page" style="width: 85%; height: auto; margin-top: 45px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
              2️⃣ When you select a file, the name of the chosen file will appear in the input field. <br />
              3️⃣ If the file has been correctly selected, press the Upload button. Please wait, as you will be automatically redirected to the results page after clicking the button.
            </El>
            
            <img src="/about/3.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
              4️⃣ When the results page appears, select the patient whose chart you want to view from the list on the left.
            </El>
            
            <img src="/about/4.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;" />
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
              5️⃣ The Naranjo Algorithm is a survey tool that can verify whether ICI medications affect hepatotoxicity. It is a tool that confirms causality through 10 questions. Check the boxes that correspond to your answers to the questions.<br />
              6️⃣ Click the 'Export This Data' button to download the currently selected patient's chart and Naranjo Algorithm survey results as an .html file. If an error message appears, please check whether a patient has been selected.<br />
              7️⃣ Click the 'Export All Data' button to download charts and Naranjo Algorithm survey results for all patients as a zip file.
            </El>
            
            <img src="/about/5.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;"/>
            <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
              8️⃣ The score below the Naranjo survey changes according to your responses among 'Yes,' 'No,' or 'Do not know or not done.<br />
              9️⃣ When you click the Submit button, your responses will be saved in local storage and will be included in the results when downloaded.<br />
              🔟 The chart has horizontal and vertical axes, and semi-transparent axes are generated when you scroll down or move sideways on the screen.
            </El>
          </El>

        </TabPanel>
			</TabContent>
		</CardBody>
	</Tabs>
</Card>
