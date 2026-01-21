<script>
  import { goto } from '$app/navigation';
  import {
		Card,
		CardHeader,
		CardBody,
    El,
    Divider
	} from 'yesvelte'
</script>

<Card>
  <CardHeader>
    <El row tag="h1" style="margin-top: 13px; margin-left: 5px;">🔧 Troubleshooting & Customization Guide</El>
  </CardHeader>
  <CardBody>
    <El container m="0" p="4">

      <!-- GitHub Issues Section -->
      <El row tag="h2" style="margin-top: -5px; color: #1e40af; font-size: 24px;">💬 Questions or Issues?</El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        If you encounter any issues, have questions, or want to suggest improvements, please visit our GitHub repository and create an issue. We're here to help!
      </El>

      <El row style="margin-top: 20px; margin-bottom: 20px;">
        <a href="https://github.com/ssohuiKim/CDM_Review/issues" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px; gap: 8px;">
          <span style="font-size: 20px;">💡</span>
          Report an Issue or Ask a Question
        </a>
      </El>

      <Divider style="margin-top: 40px; margin-bottom: 40px;" />

      <!-- Customization Guide -->
      <El row tag="h2" style="margin-top: 40px; color: #1e40af; font-size: 24px;">⚙️ Customization Guide</El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        Want to customize DILI-Assist for your institution? Follow this guide to clone the repository, modify settings, and deploy your own version.
      </El>

      <!-- Step 1: Clone Repository -->
      <El row tag="h3" style="margin-top: 30px; color: #2563eb; font-size: 18px;">📦 Step 1: Clone the Repository</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        First, clone the DILI-Assist repository from GitHub:
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`git clone https://github.com/ssohuiKim/CDM_Review.git
cd CDM_Review/frontend
npm install`}</code>
      </El>

      <!-- Step 2: Change AI Model -->
      <El row tag="h3" style="margin-top: 30px; color: #2563eb; font-size: 18px;">🤖 Step 2: Changing the AI Model</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        DILI-Assist uses <strong>Ollama with Gemma 3 12B model</strong> for Naranjo Algorithm AI analysis by default. You can customize the model and provider:
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>2.1 Locate Configuration Files</strong>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
        The AI system is split into two components:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li><strong>LLM Configuration (model, endpoint, parameters):</strong> <code>frontend/src/lib/ollama/config.js</code></li>
        <li><strong>Prompt (system instructions, reasoning logic):</strong> <code>frontend/src/lib/ollama/OllamaClient.js</code> (see <code>SYSTEM_PROMPT</code> constant)</li>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        To customize the AI model, modify <code>config.js</code>. To adjust how the AI analyzes patient data, edit the <code>SYSTEM_PROMPT</code> in <code>OllamaClient.js</code>.
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>2.2 Current Configuration (Default)</strong>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
        The default configuration in <code>frontend/src/lib/ollama/config.js</code>:
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`export const OLLAMA_CONFIG = {
  useMockAI: false,          // Set to true for testing without Ollama
  useProxy: true,            // Use SvelteKit proxy to avoid CORS
  proxyEndpoint: '/api/ollama',
  endpoint: 'http://localhost:11434',
  model: 'gemma3:12b',       // Ollama model name
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 300000            // 5 minutes
}`}</code>
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>2.3 Changing to a Different Ollama Model</strong>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
        To use a different Ollama model, edit the <code>model</code> field:
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`// Examples of other Ollama models:
model: 'llama3:8b',        // Meta Llama 3 8B
model: 'mistral:7b',       // Mistral 7B
model: 'qwen2.5:14b',      // Qwen 2.5 14B
model: 'phi3:14b',         // Microsoft Phi-3 14B`}</code>
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>2.4 Installing Ollama and Models</strong>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
        First, install Ollama on your server:
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`# Install Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the Gemma 3 12B model
ollama pull gemma3:12b

# Start Ollama service
ollama serve`}</code>
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>2.5 Alternative: Using Cloud AI APIs (Advanced)</strong>
      </El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 5px; line-height: 1.8;">
        If you prefer cloud-based AI instead of Ollama, you'll need to modify the code to support different API formats:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li><strong>OpenAI GPT-4:</strong> Modify <code>NaranjoWorkerManager.js</code> to use OpenAI API</li>
        <li><strong>Anthropic Claude:</strong> Requires API format changes for Claude's message structure</li>
        <li><strong>Google Gemini:</strong> Use Google AI Studio API endpoint</li>
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>⚠️ Important Notes:</strong>
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li>Ollama runs locally, so patient data stays on your server (privacy-preserving)</li>
        <li>Ensure Ollama service is running before starting the application</li>
        <li>Larger models (12B+) require significant RAM (16GB+ recommended)</li>
        <li>If using cloud APIs, ensure compliance with HIPAA/data privacy regulations</li>
      </El>

      <!-- Step 3: Data Processing -->
      <El row tag="h3" style="margin-top: 30px; color: #2563eb; font-size: 18px;">📊 Step 3: Customize Data Processing</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        To modify how data is processed or add custom column mappings:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li><strong>File format detection:</strong> <code>frontend/src/lib/fileFormatDetector.js</code></li>
        <li><strong>ICI drug list:</strong> Edit ICI_LIST array in <code>DrugChart.svelte</code></li>
        <li><strong>Naranjo scoring logic:</strong> <code>frontend/src/lib/survey.svelte</code></li>
      </El>

      <!-- Step 4: Build and Deploy -->
      <El row tag="h3" style="margin-top: 30px; color: #2563eb; font-size: 18px;">🚀 Step 4: Build and Deploy</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        After customization, build and deploy your application:
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>For Development:</strong>
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`cd frontend
npm run dev`}</code>
      </El>

      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 15px; line-height: 1.8;">
        <strong>For Production:</strong>
      </El>
      <El row tag="pre" style="background-color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
        <code style="font-family: monospace; font-size: 14px; color: #1e293b;">{`# Build the application
npm run build

# Using Docker Compose
docker compose up --build -d

# The app will be available on port 15465`}</code>
      </El>

      <Divider style="margin-top: 40px; margin-bottom: 40px;" />

      <!-- FAQ Section -->
      <El row tag="h2" style="margin-top: 50px; color: #1e40af; font-size: 24px;">❓ Frequently Asked Questions</El>

      <El row tag="h3" style="margin-top: 25px; color: #2563eb; font-size: 18px;">Q1. The file upload is not working. What should I do?</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        <strong>Check the following:</strong>
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li><strong>File format:</strong> Ensure your file is TSV (.txt), CSV (.csv), or tab/comma-separated text file</li>
        <li><strong>File encoding:</strong> The file must be UTF-8 encoded. Use a text editor to check and convert if necessary</li>
        <li><strong>File size:</strong> Very large files (&gt;100MB) may cause browser memory issues. Try processing smaller batches</li>
        <li><strong>Required columns:</strong> Verify that essential columns exist (patient_no, drug_name, new_drug_exposure_date, etc.)</li>
        <li><strong>Browser cache:</strong> Clear browser cache and reload the page (Ctrl+Shift+R or Cmd+Shift+R)</li>
      </El>

      <El row tag="h3" style="margin-top: 25px; color: #2563eb; font-size: 18px;">Q2. Format detection confidence is low (&lt;60%). Should I proceed?</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        Low confidence usually indicates inconsistent delimiters or formatting issues. Check the file preview carefully before uploading. If the preview looks incorrect:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li>Open the file in a text editor and ensure consistent use of tabs or commas</li>
        <li>Remove any extra spaces or special characters in column headers</li>
        <li>Verify that each row has the same number of columns</li>
      </El>

      <El row tag="h3" style="margin-top: 25px; color: #2563eb; font-size: 18px;">Q3. The page freezes or becomes unresponsive when loading data.</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        This is usually a memory issue with large datasets:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li><strong>Close other tabs:</strong> Free up browser memory by closing unused tabs</li>
        <li><strong>Use a modern browser:</strong> Chrome, Edge, or Firefox (latest versions) work best</li>
        <li><strong>Increase browser memory:</strong> For Chrome, launch with <code>--max-old-space-size=4096</code> flag</li>
        <li><strong>Split your data:</strong> Process patients in smaller groups instead of all at once</li>
      </El>

      <El row tag="h3" style="margin-top: 25px; color: #2563eb; font-size: 18px;">Q4. AI analysis is not responding or showing errors.</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        AI features require an active internet connection and API access:
      </El>
      <El row tag="ul" style="font-size: 15px; color: #333; margin-top: 5px; margin-left: 20px; line-height: 1.8;">
        <li>Check your internet connection</li>
        <li>Verify that the AI service API is configured (see Customization section above)</li>
        <li>Check browser console (F12) for specific error messages</li>
        <li>Note that some corporate firewalls may block API requests</li>
      </El>

      <El row tag="h3" style="margin-top: 25px; color: #2563eb; font-size: 18px;">Q5. Can I use this tool offline?</El>
      <El row tag="p" style="font-size: 15px; color: #333; margin-top: 10px; line-height: 1.8;">
        Yes, partially. The core data visualization and Naranjo scoring work completely offline since all processing happens in your browser using DuckDB-wasm. However, AI analysis and PubMed literature search require internet connectivity.
      </El>

      <Divider style="margin-top: 40px; margin-bottom: 40px;" />

      <!-- Browser Compatibility -->
      <El row tag="h2" style="margin-top: 40px; color: #1e40af; font-size: 24px;">🌐 Browser Compatibility</El>

      <El row style="margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Browser</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">Status</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Notes</th>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Chrome / Edge (v100+)</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #16a34a; font-weight: bold;">✅ Recommended</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Best performance with DuckDB-wasm</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Firefox (v100+)</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #16a34a; font-weight: bold;">✅ Supported</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Fully functional</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Safari (v15+)</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #ca8a04; font-weight: bold;">⚠️ Limited</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">May have performance issues with large datasets</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Internet Explorer</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #dc2626; font-weight: bold;">❌ Not Supported</td>
            <td style="border: 1px solid #e2e8f0; padding: 12px;">Please use a modern browser</td>
          </tr>
        </table>
      </El>
    </El>
  </CardBody>
</Card>
