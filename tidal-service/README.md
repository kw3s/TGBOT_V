# Tidal Download Service

HiRes/Atmos audio download service using tidal-dl-ng.

## Features
- Download from Tidal (with token authentication)
- Support for HIGH, LOSSLESS (HiRes), and HI_RES (Master/Atmos)
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
  "url": "https://tidal.com/browse/track/...",
  "quality": "hires" | "master" | "high"
}
```

## Environment Variables

- `TIDAL_TOKEN` - Tidal access token (required)
- `PORT` - Server port (default: 8000)

## Deployment (Render/Railway)

1. Create new project
2. Connect to this directory
3. Set environment variables:
   - `TIDAL_TOKEN=your_token_here`
4. Deploy!

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
export TIDAL_TOKEN="your_token_here"

# Run server
python app.py
```

## Getting Tidal Token

See tidal-dl-ng documentation for authentication methods.
