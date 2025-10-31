# CDM-Review

Medical data visualization and analysis system for Drug-Induced Liver Injury (DILI) research with AI-powered Naranjo Algorithm assessment.

## Features

- 📊 **Patient Data Visualization**: Interactive drug charts with timeline visualization
- 🤖 **AI-Powered Analysis**: LocalAI integration for Naranjo Algorithm assessment
- 📝 **Naranjo Algorithm Survey**: Standard causality assessment with AI reasoning support
- 💬 **Literature Search Chatbot**: PubMed integration for DILI research
- 📄 **Report Generation**: Export patient reports with charts and survey results

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

## AI Features Setup (Optional)

The AI reasoning feature requires LocalAI with a language model. This is **optional** and the application works without it.

### Download AI Model

**⚠️ Model files are NOT included in the repository due to size (~4GB)**

Download the recommended model:

```bash
# Create models directory
mkdir -p localai/models
cd localai/models

# Download Mistral 7B Instruct (Q4 quantization, ~4GB)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

**Alternative models:**

- **Smaller** (2-3GB): [Llama 2 7B Chat Q3](https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF)
- **Larger** (7-8GB): [Mistral 7B Q5](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF)

### Start LocalAI

```bash
docker run -d \
  --name localai-naranjo \
  -p 8080:8080 \
  -v $(pwd)/localai/models:/models \
  quay.io/go-skynet/local-ai:latest \
  --models-path /models \
  --model mistral-7b-instruct-v0.2.Q4_K_M.gguf \
  --threads 4 \
  --context-size 4096
```

### Enable AI Features

Edit `frontend/src/lib/localai/config.js`:

```javascript
export const LOCALAI_CONFIG = {
    useMockAI: false,  // Change to false to use real LocalAI
    // ...
};
```

For detailed setup instructions, see [LOCALAI_SETUP.md](LOCALAI_SETUP.md) or [QUICKSTART_AI.md](QUICKSTART_AI.md).

## Project Structure

```
CDM_Review/
├── frontend/               # SvelteKit application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── localai/   # LocalAI integration
│   │   │   ├── chatbot/   # Literature search chatbot
│   │   │   └── *.svelte   # UI components
│   │   └── routes/        # Pages
│   └── static/            # Static assets
├── localai/
│   └── models/            # AI models (download separately)
├── nginx/                 # Nginx configuration
└── docker-compose.yml     # Docker setup
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)**: Detailed project overview and architecture
- **[LOCALAI_SETUP.md](LOCALAI_SETUP.md)**: Complete LocalAI setup guide
- **[QUICKSTART_AI.md](QUICKSTART_AI.md)**: Quick start guide for AI features
- **[copilot-instructions.md](copilot-instructions.md)**: Chatbot implementation guidelines

## Technology Stack

- **Frontend**: SvelteKit with static adapter
- **UI Library**: yesvelte
- **Data Processing**: DuckDB-wasm (in-browser SQL)
- **AI**: LocalAI with GGUF models
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

Upload CSV/TSV files with the following columns:
- `patient_no`: Patient identifier
- `new_drug_exposure_date` or `measurement_date`: Timeline dates
- `day_num`: Day number in treatment
- `drug_name`: Drug name
- `grade`: Hepatotoxicity severity grade
- Plus other clinical data fields

See [CLAUDE.md](CLAUDE.md) for complete schema details.

## Security Notes

- **PHI Protection**: The application sanitizes protected health information before any external API calls
- **Local Processing**: All data processing happens client-side using DuckDB-wasm
- **Optional AI**: AI features are optional and use local models (no external API calls when using LocalAI)

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
