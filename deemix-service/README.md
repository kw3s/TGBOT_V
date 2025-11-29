# Deemix Audio Download Service

High-quality audio download microservice using Deemix for Deezer integration.

## Features

- 🎵 High-quality audio downloads from Deezer (FLAC/MP3 320kbps)
- 🚀 FastAPI REST API
- 🔄 Health check endpoint for monitoring
- ⏱️ Configurable download timeouts
- 🛡️ Error handling and logging

## Getting Your Deezer ARL Cookie

The ARL (Authentication and Resource Locator) cookie is required to download from Deezer.

### Method 1: Browser Developer Tools

1. **Open Deezer**: Go to [deezer.com](https://www.deezer.com) and log in
2. **Open DevTools**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. **Navigate to Application/Storage**:
   - Chrome: `Application` tab → `Cookies` → `https://www.deezer.com`
   - Firefox: `Storage` tab → `Cookies` → `https://www.deezer.com`
4. **Find the ARL cookie**: Look for a cookie named `arl`
5. **Copy the value**: It's a long string of letters and numbers

### Method 2: Browser Extension

1. Install a cookie viewer extension (e.g., "EditThisCookie" for Chrome)
2. Navigate to deezer.com while logged in
3. Click the extension icon
4. Find and copy the `arl` cookie value

> ⚠️ **Important**: Keep your ARL private! It's equivalent to your password.

## Deployment

### Deploy to Render.com

1. **Create New Web Service**:
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `deemix-service`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `deemix-service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**:
   - Go to "Environment" tab
   - Add: `DEEZER_ARL` = `your_arl_cookie_value`

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Note your service URL: `https://deemix-service-xxxx.onrender.com`

### Deploy to Railway.app

1. **Create New Project**:
   - Go to [railway.app](https://railway.app) and sign in
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Configure Service**:
   - Railway will auto-detect Python
   - Go to "Settings" tab
   - **Root Directory**: `deemix-service`

3. **Add Environment Variables**:
   - Go to "Variables" tab
   - Add: `DEEZER_ARL` = `your_arl_cookie_value`
   - Add: `PORT` = `8000` (Railway auto-assigns but we set default)

4. **Deploy**:
   - Railway deploys automatically
   - Go to "Settings" → "Generate Domain" to get public URL
   - Note your service URL: `https://deemix-service-production.up.railway.app`

## Testing the Service

### Health Check

```bash
curl https://your-service-url.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "deezer_logged_in": true,
  "timestamp": "2024-01-01T12:00:00.000000"
}
```

### Download Track

```bash
curl -X POST https://your-service-url.onrender.com/download \
  -H "Content-Type: application/json" \
  -d '{"query": "Kendrick Lamar HUMBLE"}'
```

Expected response:
```json
{
  "success": true,
  "file_path": "/tmp/deemix_downloads_1234/Kendrick Lamar - HUMBLE.flac",
  "title": "HUMBLE.",
  "artist": "Kendrick Lamar",
  "duration": 177
}
```

## API Endpoints

### `GET /`
Root endpoint with service information.

### `GET /health`
Health check endpoint. Returns 200 if service is healthy, 503 if Deezer login failed.

### `POST /download`
Download a track from Deezer.

**Request Body:**
```json
{
  "query": "Artist Name - Track Name",
  "timeout": 60
}
```

**Response:**
```json
{
  "success": true,
  "file_path": "/path/to/file.flac",
  "title": "Track Name",
  "artist": "Artist Name",
  "duration": 180,
  "error": null
}
```

## Environment Variables

- `DEEZER_ARL` (required): Your Deezer ARL cookie
- `PORT` (optional): Server port (default: 8000, auto-set by platforms)

## Troubleshooting

### "Deezer not logged in" Error

- **Check ARL**: Verify your ARL cookie is correct
- **ARL Expired**: ARL cookies can expire - get a fresh one
- **Format**: Ensure no extra spaces or quotes around the ARL value

### Download Fails

- **Track Not Available**: Some tracks aren't available in all regions
- **Timeout**: Increase timeout value in request
- **Rate Limiting**: Deezer may throttle downloads - wait a few minutes

### Service Unhealthy

- Check Render/Railway logs for errors
- Verify environment variables are set correctly
- Ensure service has restarted after setting ARL

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
export DEEZER_ARL="your_arl_here"

# Run service
python app.py
```

Service will be available at `http://localhost:8000`

## Notes

- Free tier limits: Render (750 hours/month), Railway (500 hours/month)
- Services spin down after inactivity on free tier (30s cold start)
- FLAC downloads are ~30-50MB, MP3 320kbps are ~8-12MB
- Download time: typically 5-20 seconds depending on file size
