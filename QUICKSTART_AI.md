# Quick Start: AI Reasoning Feature

Get the AI reasoning feature up and running in 5 minutes.

## Prerequisites Check

```bash
# Check if Docker is installed
docker --version

# Check available disk space (need ~5GB)
df -h

# Check available RAM (need ~8GB)
free -h
```

## Step 1: Create Models Directory

```bash
mkdir -p /bce/groups/pnucolab-old/analysis/CDM_Review/localai/models
cd /bce/groups/pnucolab-old/analysis/CDM_Review/localai/models
```

## Step 2: Download Model (One-Time Setup)

```bash
# Download Mistral 7B Instruct (4GB, takes 5-10 minutes)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

**Alternative:** Use a smaller model if RAM is limited:
```bash
# Smaller option: Llama 2 7B (~3.5GB)
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

## Step 3: Start LocalAI

```bash
# From the CDM_Review directory
cd /bce/groups/pnucolab-old/analysis/CDM_Review

# Start LocalAI with Docker
docker run -d \
  --name localai-naranjo \
  -p 8080:8080 \
  -v $(pwd)/localai/models:/models \
  quay.io/go-skynet/local-ai:latest \
  --models-path /models \
  --model mistral-7b-instruct-v0.2.Q4_K_M.gguf \
  --threads 4 \
  --context-size 4096

# Wait 30-60 seconds for model to load
sleep 60

# Check if it's running
curl http://localhost:8080/v1/models
```

**Expected output:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "mistral-7b-instruct-v0.2.Q4_K_M.gguf",
      ...
    }
  ]
}
```

## Step 4: Configure Frontend

```bash
cd frontend

# Copy environment file
cp .env.example .env

# (Optional) Edit if LocalAI is on different port
# nano .env
```

## Step 5: Start Development Server

```bash
# Install dependencies (if not already done)
npm install

# Start the dev server
npm run dev
```

**The server will start on http://localhost:5173**

## Step 6: Test the Feature

1. **Open browser:** Navigate to `http://localhost:5173`

2. **Upload data:** Upload your patient CSV/TSV file

3. **Go to results:** Click to view results page

4. **Select a patient:** Click on a patient from the left panel

5. **Check AI status:** In the Naranjo Algorithm section (right panel), you should see:
   - ✅ If working: Button says "Analyze with AI"
   - ❌ If not working: Red text says "AI Offline"

6. **Test AI reasoning:**
   - Click **"Analyze with AI"**
   - Wait for processing (shows "AI Processing...")
   - When complete, a 💡 icon appears
   - Click 💡 to view detailed reasoning
   - Click **"Apply AI Answers"** to auto-fill survey

## Verification Checklist

- [ ] LocalAI container is running: `docker ps | grep localai`
- [ ] LocalAI responds to health check: `curl http://localhost:8080/v1/models`
- [ ] Frontend dev server is running: `npm run dev` shows no errors
- [ ] Proxy endpoint works: Visit `http://localhost:5173/api/localai` (should show JSON)
- [ ] Browser shows "Analyze with AI" button (not "AI Offline")

## Troubleshooting

### "AI Offline" Message

```bash
# 1. Check if LocalAI is running
docker ps | grep localai

# 2. If not running, start it
docker start localai-naranjo

# 3. Check logs for errors
docker logs localai-naranjo

# 4. Verify health
curl http://localhost:8080/v1/models

# 5. Restart dev server
cd frontend
npm run dev
```

### Model Loading is Slow

```bash
# Check loading progress
docker logs -f localai-naranjo

# You should see:
# "Loading model..."
# "Model loaded successfully"
```

This can take 30-120 seconds depending on your system.

### Port 8080 Already in Use

```bash
# Find what's using port 8080
lsof -i :8080

# Kill the process or use a different port:
docker run -d \
  --name localai-naranjo \
  -p 8081:8080 \  # Use port 8081 instead
  # ... rest of command

# Then update frontend/.env:
LOCALAI_ENDPOINT=http://localhost:8081
```

### Out of Memory

If you see memory errors:

1. **Use a smaller model:**
   ```bash
   # Stop current container
   docker stop localai-naranjo
   docker rm localai-naranjo

   # Download smaller model (Q3 quantization)
   cd localai/models
   wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q3_K_M.gguf

   # Restart with smaller model
   docker run -d \
     --name localai-naranjo \
     -p 8080:8080 \
     -v $(pwd)/localai/models:/models \
     quay.io/go-skynet/local-ai:latest \
     --models-path /models \
     --model mistral-7b-instruct-v0.2.Q3_K_M.gguf \
     --threads 2 \
     --context-size 2048
   ```

2. **Reduce threads:**
   Change `--threads 4` to `--threads 2`

3. **Close other applications**

## Common Commands

```bash
# View LocalAI logs
docker logs localai-naranjo

# Restart LocalAI
docker restart localai-naranjo

# Stop LocalAI
docker stop localai-naranjo

# Remove LocalAI container
docker rm localai-naranjo

# Check system resources
docker stats localai-naranjo
```

## What's Next?

- For detailed configuration: See [LOCALAI_SETUP.md](LOCALAI_SETUP.md)
- For architecture details: See [CLAUDE.md](CLAUDE.md)
- For model selection: Browse [HuggingFace GGUF models](https://huggingface.co/models?library=gguf)

## Performance Tips

### Speed up inference:
- Use GPU acceleration (if available)
- Reduce `--context-size` to 2048
- Use Q4 quantization (good balance of speed and quality)

### Improve quality:
- Use larger models (13B instead of 7B)
- Use higher quantization (Q5 or Q6)
- Increase `--context-size` to 8192

### Save resources:
- Use Q3 quantization
- Reduce `--threads` to 2
- Stop container when not in use: `docker stop localai-naranjo`

## Support

If you encounter issues:

1. **Check logs:** `docker logs localai-naranjo`
2. **Check browser console:** Press F12, look for errors in Console tab
3. **Check proxy:** Visit `http://localhost:5173/api/localai` in browser
4. **Read full docs:** [LOCALAI_SETUP.md](LOCALAI_SETUP.md)

---

**Estimated Time:** 5-10 minutes (plus model download time)
**Disk Space Required:** ~5GB
**RAM Required:** ~8GB minimum (16GB recommended)
