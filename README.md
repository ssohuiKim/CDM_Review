# DILI-Assist (CDM-Review)

Medical data visualization and analysis system for Drug-Induced Liver Injury (DILI) research with AI-powered Naranjo Algorithm assessment.

## Features

- **Patient Data Visualization**: Interactive drug charts with timeline visualization
- **AI-Powered Analysis**: Ollama integration with Gemma 3 12B for Naranjo Algorithm assessment
- **Naranjo Algorithm Survey**: Standard causality assessment with AI reasoning support
- **Literature Search Assistant**: PubMed integration for DILI research
- **Report Generation**: Export patient reports with charts and survey results

## Quick Start

### 1. Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

### 2. Docker Deployment

```bash
docker compose up --build
```

Access the application at `http://localhost:15465`

## AI Features Setup

The AI reasoning feature uses Ollama with Gemma 3 12B model for on-premise inference.

### Ollama Setup

Ollama is configured in `docker-compose.yml` and starts automatically with the application.

```bash
# Pull the Gemma 3 12B model
docker exec -it cdm_review-ollama-1 ollama pull gemma3:12b
```

### AI Configuration

Edit `frontend/src/lib/ollama/config.js`:

```javascript
export const OLLAMA_CONFIG = {
    useMockAI: false,  // Set to false to use real Ollama
    model: 'gemma3:12b',
    // ...
};
```

## Project Structure

```
CDM_Review/
├── frontend/               # SvelteKit application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── ollama/            # Ollama AI integration
│   │   │   ├── literatureAssistant/  # Literature search assistant
│   │   │   └── *.svelte           # UI components
│   │   └── routes/        # Pages
│   └── static/            # Static assets
├── nginx/                 # Nginx configuration
└── docker-compose.yml     # Docker setup
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)**: Detailed project overview and architecture
- **[copilot-instructions.md](copilot-instructions.md)**: Chatbot implementation guidelines

## Technology Stack

- **Frontend**: SvelteKit with adapter-node
- **UI Library**: yesvelte
- **Data Processing**: DuckDB-wasm (in-browser SQL)
- **AI**: Ollama with Gemma 3 12B (quantized)
- **Deployment**: Docker + nginx
- **Charts**: Custom canvas-based visualizations

## Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Data Requirements

Upload TSV files with the following columns:
- `patient_no`: Patient identifier
- `gender_source_value`: Patient gender
- `age`: Patient age
- `new_drug_exposure_date`: Date of drug exposure
- `day_num`: Day number in treatment timeline
- `drug_concept_id`: OMOP drug concept identifier
- `drug_name`: Drug name
- `drug_name_dose`: Drug name with dosage information
- `ICI_lasting`: ICI drug effect duration indicator
- `measurement_date`: Date of laboratory measurement
- `grade`: Hepatotoxicity severity grade (0-4)
- `diagnosis_group`: Drug hepatotoxicity classification (toxic/safe)

See the About page in the application for detailed data extraction instructions.

## Security & Privacy

- **Client-side Processing**: All patient data processing happens in-browser using DuckDB-wasm
- **On-premise AI**: AI inference runs locally via Ollama (no external API calls)
- **PHI Sanitization**: Protected health information is sanitized before any external API calls
- **No Server Storage**: Patient data is never stored on the server

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions:
- Create an issue in the repository
- Check documentation files for detailed guides
- Review console logs (F12) for debugging

---

**Note**: This application is for research purposes. AI-generated assessments should be reviewed by qualified medical professionals.
