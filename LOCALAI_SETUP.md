# LocalAI Setup Guide for Naranjo Algorithm AI Reasoning

This guide explains how to set up LocalAI to enable AI-powered reasoning for the Naranjo Algorithm survey in CDM-Review.

## Overview

The AI reasoning feature uses LocalAI (a local LLM server) to analyze patient data and provide automated answers with explanations for the 10 Naranjo Algorithm questions. This runs entirely on your local machine without sending data to external APIs.

## Architecture

```
User Interface (Survey.svelte)
    ↓
WebWorker (naranjo.worker.js) - Background processing
    ↓
LocalAI Client (LocalAIClient.js)
    ↓
LocalAI Server (localhost:8080)
    ↓
LLM Model (e.g., Mistral-7B-Instruct)
```

## Prerequisites

- Docker installed on your system
- At least 8GB RAM available (16GB recommended for 7B models)
- At least 5GB free disk space for the model

## Step 1: Download the Model

Create a directory for models and download a suitable model:

```bash
# Create models directory
mkdir -p ~/localai/models
cd ~/localai/models

# Download Mistral 7B Instruct model (recommended)
# This is a 4-bit quantized version (~4GB)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

### Alternative Models

You can use other models as well:

**Small Models (4-8GB RAM):**
```bash
# Llama 2 7B Chat (Q4 quantization)
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

**Larger Models (16GB+ RAM):**
```bash
# Mixtral 8x7B Instruct (Q4 quantization) - Better quality
wget https://huggingface.co/TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF/resolve/main/mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf
```

## Step 2: Start LocalAI Server

### Option A: Using Docker (Recommended)

```bash
# Run LocalAI with the downloaded model
docker run -d \
  --name localai-naranjo \
  -p 8080:8080 \
  -v ~/localai/models:/models \
  quay.io/go-skynet/local-ai:latest \
  --models-path /models \
  --model mistral-7b-instruct-v0.2.Q4_K_M.gguf \
  --threads 4 \
  --context-size 4096
```

**Parameters explained:**
- `-p 8080:8080`: Expose LocalAI on port 8080
- `-v ~/localai/models:/models`: Mount models directory
- `--threads 4`: Use 4 CPU threads (adjust based on your CPU)
- `--context-size 4096`: Maximum context window

### Option B: Using Docker Compose

Create a `docker-compose.localai.yml` file:

```yaml
version: '3.8'

services:
  localai:
    image: quay.io/go-skynet/local-ai:latest
    container_name: localai-naranjo
    ports:
      - "8080:8080"
    volumes:
      - ~/localai/models:/models
    command:
      - --models-path=/models
      - --model=mistral-7b-instruct-v0.2.Q4_K_M.gguf
      - --threads=4
      - --context-size=4096
    restart: unless-stopped
```

Start the service:

```bash
docker-compose -f docker-compose.localai.yml up -d
```

## Step 3: Verify LocalAI is Running

Check if LocalAI is responding:

```bash
# Test the models endpoint
curl http://localhost:8080/v1/models

# You should see a JSON response listing your model
```

Or visit in your browser:
```
http://localhost:8080/v1/models
```

## Step 4: Configure CDM-Review

The application uses a **SvelteKit API proxy** to communicate with LocalAI. This avoids CORS (Cross-Origin Resource Sharing) issues when calling LocalAI from the browser.

### Environment Configuration

1. Copy the example environment file:

```bash
cd frontend
cp .env.example .env
```

2. Edit `.env` if needed (optional, defaults work for standard setup):

```bash
# LocalAI endpoint (default: http://localhost:8080)
LOCALAI_ENDPOINT=http://localhost:8080

# LocalAI model name
LOCALAI_MODEL=mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

### Proxy Configuration

By default, the application uses the SvelteKit API proxy at `/api/localai`. This is configured in `frontend/src/lib/localai/config.js`:

```javascript
export const LOCALAI_CONFIG = {
    useProxy: true,  // Use SvelteKit proxy (recommended)
    proxyEndpoint: '/api/localai',
    // ...
};
```

**Note:** The proxy runs on the SvelteKit development server, so you must use `npm run dev` (not static build) for the AI features to work during development.

## Step 5: Build and Run CDM-Review

```bash
cd frontend
npm install
npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

## Using the AI Reasoning Feature

1. Upload your patient data CSV/TSV file
2. Navigate to the `/result` page
3. Select a patient from the left panel
4. In the Naranjo Algorithm survey (right panel):
   - Click **"Analyze with AI"** button
   - Wait for processing (status shows "AI Processing...")
   - When complete, a 💡 icon appears
   - Click 💡 to view detailed reasoning
   - Click **"Apply AI Answers"** to auto-fill the survey

## Performance Optimization

### Adjust Thread Count

Based on your CPU cores:
```bash
# Check your CPU cores
nproc

# Use 50-75% of available cores
# For 8 cores, use --threads=4 or --threads=6
```

### GPU Acceleration (Optional)

If you have an NVIDIA GPU:

```bash
docker run -d \
  --name localai-naranjo \
  --gpus all \
  -p 8080:8080 \
  -v ~/localai/models:/models \
  quay.io/go-skynet/local-ai:v2.8.0-cublas-cuda12 \
  --models-path /models \
  --model mistral-7b-instruct-v0.2.Q4_K_M.gguf \
  --gpu-layers 32
```

## Troubleshooting

### LocalAI Not Responding

```bash
# Check if container is running
docker ps | grep localai

# Check logs
docker logs localai-naranjo

# Restart the container
docker restart localai-naranjo
```

### UI Shows "AI Offline"

1. **Verify LocalAI is running:**
   ```bash
   curl http://localhost:8080/v1/models
   ```
   You should see a JSON response listing available models.

2. **Check if model is loaded:**
   ```bash
   docker logs localai-naranjo
   ```
   Look for messages like "Model loaded successfully".

3. **Verify the proxy is working:**
   Open your browser and navigate to:
   ```
   http://localhost:5173/api/localai
   ```
   (Adjust port if your SvelteKit dev server runs on a different port)

   You should see a JSON response with:
   ```json
   {
     "status": "ok",
     "endpoint": "http://localhost:8080",
     "models": {...}
   }
   ```

4. **Check browser console for errors:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any red error messages
   - Common errors:
     - `Failed to fetch`: LocalAI is not running
     - `503 Service Unavailable`: LocalAI is not responding
     - `CORS error`: You may need to use the proxy (should be enabled by default)

5. **Restart the development server:**
   ```bash
   # Stop the dev server (Ctrl+C)
   npm run dev
   ```

6. **Check environment variables:**
   - Ensure `.env` file exists in `frontend/` directory
   - Verify `LOCALAI_ENDPOINT` matches where LocalAI is running

### Slow Response Times

- Reduce model size (use Q4 instead of Q5/Q6)
- Increase thread count
- Consider GPU acceleration
- Reduce context-size to 2048

### Out of Memory Errors

- Use smaller model (Q3 or Q4 quantization)
- Reduce thread count
- Reduce context-size
- Close other applications

## Security Considerations

### PHI Protection

The application implements **PHI (Protected Health Information) sanitization**:

- Patient identifiers are removed before sending to LocalAI
- Only anonymized clinical data is transmitted
- All processing happens locally (no external API calls)

### Network Security

LocalAI runs on `localhost` by default, accessible only from your machine. To restrict access further:

```bash
# Bind only to localhost
docker run -d \
  -p 127.0.0.1:8080:8080 \
  # ... other options
```

## Resource Requirements

| Model Size | RAM Required | Disk Space | Inference Speed |
|------------|--------------|------------|-----------------|
| 7B Q4      | 6-8 GB       | ~4 GB      | 5-10 tokens/s   |
| 7B Q5      | 8-10 GB      | ~5 GB      | 4-8 tokens/s    |
| 13B Q4     | 10-12 GB     | ~7 GB      | 2-5 tokens/s    |
| Mixtral Q4 | 16-20 GB     | ~24 GB     | 1-3 tokens/s    |

*Speeds vary based on CPU/GPU and context size*

## Advanced Configuration

### Custom Model Configuration

Edit `frontend/src/lib/localai/config.js`:

```javascript
export const LOCALAI_CONFIG = {
    endpoint: 'http://localhost:8080',
    model: 'your-model-name.gguf',

    // Adjust generation parameters
    temperature: 0.7,      // 0.0-1.0 (lower = more conservative)
    maxTokens: 2000,       // Maximum response length
    topP: 0.95,            // Nucleus sampling parameter

    timeout: 60000,        // Request timeout (ms)
};
```

### Multiple Model Support

You can run multiple LocalAI instances on different ports:

```bash
# Medical model on 8080
docker run -d --name localai-medical -p 8080:8080 ...

# General model on 8081
docker run -d --name localai-general -p 8081:8080 ...
```

Then switch between them in the config.

## Stopping LocalAI

```bash
# Stop the container
docker stop localai-naranjo

# Remove the container
docker rm localai-naranjo

# To stop and remove
docker rm -f localai-naranjo
```

## Additional Resources

- [LocalAI Documentation](https://localai.io/docs/)
- [Model Hub (HuggingFace)](https://huggingface.co/models?library=gguf)
- [GGUF Format Guide](https://github.com/ggerganov/llama.cpp#quantization)

## Support

For issues related to:
- **LocalAI setup**: Check LocalAI documentation
- **CDM-Review integration**: Create an issue in the repository
- **Model selection**: Consult HuggingFace model cards
