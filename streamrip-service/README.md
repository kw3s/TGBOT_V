# Streamrip Download Service

High-quality audio download service using streamrip (dev branch).

## Features
- Download from Deezer (with ARL authentication)
- Smart Spotify → Deezer search
- Support for MP3 (320kbps) and FLAC
- FastAPI-based REST API

## API Endpoints

### Health Check
```
GET /health
```

### Download Track
```
POST /download
{
  "url": "https://open.spotify.com/track/... or https://deezer.com/track/...",
  "quality": "mp3" | "flac"
}
```

## Environment Variables

- `DEEZER_ARL` - Deezer ARL cookie (required)
- `PORT` - Server port (default: 8000)

## Deployment (Railway)

1. Create new Railway project
2. Connect to this directory
3. Set environment variables:
   - `DEEZER_ARL=your_arl_here`
4. Deploy!

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
export DEEZER_ARL="your_arl_here"

# Run server
python app.py
```

## Testing

```bash
curl -X POST http://localhost:8000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.spotify.com/track/...", "quality": "mp3"}' \
  --output test.mp3
```
