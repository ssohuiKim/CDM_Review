# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CDM-Review is a medical data visualization and analysis system for Drug-Induced Liver Injury (DILI) research. The application visualizes patient data obtained from Clinical Data Models (CDM) for patients taking immune checkpoint inhibitors who showed hepatotoxicity. It helps medical professionals identify patients and make medication-related decisions.

**Tech Stack:**
- Frontend: SvelteKit with static adapter
- UI Library: yesvelte
- Data Processing: DuckDB-wasm (in-browser SQL database)
- Deployment: Docker with nginx reverse proxy
- Charts: Custom canvas-based visualizations

## Development Commands

### Frontend Development
```bash
cd frontend
npm install           # Install dependencies
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker compose up --build

# Services expose on port 15465 (nginx proxy)
# Both frontend and nginx services are configured with restart: always
```

### Build Output
- Build output: `frontend/build/`
- The Dockerfile copies build output to `/mnt/volume/` for nginx to serve
- Static adapter is used for SvelteKit

## Architecture Overview

### Data Flow Architecture
```
File Upload (CSV/TSV/TXT)
  → File Format Detection (auto-detect delimiter)
  → DuckDB-wasm Processing (in-browser)
  → Patient Data Grouping (by patient_no)
  → Visualization Components
```

**Key Point:** All data processing happens client-side using DuckDB-wasm. No backend server for data processing exists (backend directory is empty).

### Component Hierarchy

**Main Pages:**
- `/` ([+page.svelte](frontend/src/routes/+page.svelte)) - File upload interface with drag-and-drop
- `/result` ([result/+page.svelte](frontend/src/routes/result/+page.svelte)) - Patient data visualization with 3-panel layout

**3-Panel Layout in `/result`:**
1. **Left Panel** - Patient list (clickable patient numbers)
2. **Center Panel** - Drug chart visualization (timeline with grades, ICI drugs, ALT/AST ratios, and all drugs)
3. **Right Panel** - Naranjo Algorithm Survey + Literature Search Chatbot

### Core Data Processing

**File Format Detection** ([fileFormatDetector.js](frontend/src/lib/fileFormatDetector.js)):
- Auto-detects delimiters: Tab (TSV), Comma (CSV), Space (TXT)
- Analyzes first 10 lines to determine format
- Shows confidence score and preview to user
- Provides format-specific hints based on file extension

**DuckDB Integration** ([duckdb.js](frontend/src/lib/duckdb.js)):
- Initializes DuckDB-wasm instance
- Stores parsed data in Svelte stores: `parsedData` and `groupedPatientData`
- Data is grouped by `patient_no` field for multi-patient support

### Visualization Components

**DrugChart.svelte** ([lib/DrugChart.svelte](frontend/src/lib/DrugChart.svelte)):
- Canvas-based timeline visualization
- Displays 4 sections vertically:
  1. Grade markers (hepatotoxicity severity)
  2. ICI drugs (Immune Checkpoint Inhibitors: Atezolizumab, Nivolumab, Pembrolizumab, Ipilimumab)
  3. ALT/AST ratio chart
  4. All drugs (toxic vs safe drugs based on diagnosis_group)
- Color coding: toxic drugs (red), safe drugs (blue)
- Hover tooltips show drug names and dates

**AxisChart.svelte** ([lib/axisChart.svelte](frontend/src/lib/axisChart.svelte)):
- Renders the timeline axis below the drug chart
- Synchronized with DrugChart dimensions

**Survey.svelte** ([lib/survey.svelte](frontend/src/lib/survey.svelte)):
- Naranjo Algorithm questionnaire (10 questions)
- Stores responses in localStorage keyed by patient number
- Calculates causality score based on scoring rules
- Includes note/memo field for each patient

### Chatbot Feature

**Purpose:** Literature search assistant for DILI research (consult [copilot-instructions.md](copilot-instructions.md) for detailed implementation guidelines)

**Components:**
- [ChatBot.svelte](frontend/src/lib/chatbot/ChatBot.svelte) - Main chatbot interface
- [CircularChatButton.svelte](frontend/src/lib/chatbot/CircularChatButton.svelte) - Toggle button
- [QueryValidator.js](frontend/src/lib/chatbot/QueryValidator.js) - Input validation
- [QuerySanitizer.js](frontend/src/lib/chatbot/QuerySanitizer.js) - PHI sanitization layer
- [PubMedClient.js](frontend/src/lib/chatbot/PubMedClient.js) - PubMed API integration

**Security Requirements:**
- **CRITICAL:** Never send PHI (Protected Health Information) to external APIs
- All queries must pass through QueryValidator and QuerySanitizer before external calls
- Sanitize patient identifiers, specific numbers, hospital names, and personal information
- All external API calls must go through validation layers

### Data Schema Expectations

The application expects uploaded files to contain these columns:
- `patient_no` - Patient identifier (used for grouping)
- `new_drug_exposure_date` or `measurement_date` - Timeline dates
- `day_num` - Day number in treatment timeline
- `drug_concept_id` - Drug identifier
- `drug_name` - Drug name
- `ICI_lasting` - ICI treatment duration indicator
- `diagnosis_group` - Used to classify drugs as toxic/safe
- `gender`, `age` - Patient demographics
- `grade` - Hepatotoxicity severity grade

### State Management

**Svelte Stores** ([duckdb.js](frontend/src/lib/duckdb.js)):
- `parsedData` - All parsed patient records
- `groupedPatientData` - Records grouped by patient_no

**LocalStorage:**
- `naranjoAlgorithmData` - Survey responses and scores per patient
  - Structure: `{ [patient_no]: { totalScore, note, answers: {...} } }`

### Report Generation

The `/result` page includes a report export feature that:
1. Captures chart canvas as PNG
2. Generates HTML with survey data from localStorage
3. Creates downloadable ZIP file (using JSZip and file-saver)
4. Includes patient demographics, charts, and survey results

## Important Implementation Notes

### File Format Detection
- The auto-detection system in `fileFormatDetector.js` uses a scoring algorithm
- Tab delimiters have higher weight (1.2) due to medical data conventions
- Always show confidence scores and previews to users before processing
- Low confidence (<60%) triggers warnings

### DuckDB Query Generation
- Delimiter must be escaped properly for DuckDB's `read_csv` function
- Tab becomes `'\t'`, comma becomes `','`
- The query uses `header=true, auto_detect=false` with explicit delimiter

### Canvas Chart Rendering
- DrugChart uses fixed pixel constants (see lines 54-65 in DrugChart.svelte)
- Width is dynamically calculated: `(totalDays × boxWidth) + margins`
- Height depends on number of drugs displayed
- Minimum width is enforced (default 550px) with horizontal scrolling

### ICI Drug Identification
- Case-insensitive matching against ICI_LIST
- Only 4 specific drugs are tracked: Atezolizumab, Nivolumab, Pembrolizumab, Ipilimumab

### Security in Chatbot
Per [copilot-instructions.md](copilot-instructions.md), when working on chatbot features:
1. Always implement `containsSensitiveInfo()` checks before external API calls
2. Use `sanitizeQuery()` to remove patient identifiers, numbers, dates, hospital names
3. Never log or transmit raw user input that may contain PHI
4. Add disclaimers about AI-generated medical information

## Testing Files

Test files are available in the repository:
- `delimiter_test.html` - Delimiter detection testing
- `format_detector_test.html` - Format detection testing
- `test_files/` - Sample data files for testing

## Language

The UI is primarily in English, but Korean comments and labels appear throughout the codebase. Recent commits show transition from Korean to English language in the interface.
