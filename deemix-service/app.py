import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("deemix-service")

app = FastAPI(title="Deemix Service")

class SearchRequest(BaseModel):
    query: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    arl_set = bool(os.getenv("DEEZER_ARL"))
    return JSONResponse({
        "status": "healthy",
        "deezer_arl_configured": arl_set
    })

@app.post("/search")
async def search_track(request: SearchRequest):
    """
    Search for a track on Deezer and return the track URL and metadata.
    The bot will use yt-dlp with DEEZER_ARL cookie to download.
    """
    try:
        logger.info(f"Searching Deezer for: {request.query}")
        
        # Search Deezer API
        search_url = f"https://api.deezer.com/search/track?q={requests.utils.quote(request.query)}&limit=1"
        response = requests.get(search_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'data' not in data or len(data['data']) == 0:
            logger.info(f"No results found for: {request.query}")
            return JSONResponse({
                "success": False,
                "error": "Track not found on Deezer"
            }, status_code=404)
        
        track = data['data'][0]
        track_id = track['id']
        track_title = track['title']
        artist_name = track['artist']['name']
        album_title = track.get('album', {}).get('title', '')
        duration = track.get('duration', 0)
        
        # Build Deezer track URL (for yt-dlp)
        track_url = f"https://www.deezer.com/track/{track_id}"
        
        logger.info(f"Found: {artist_name} - {track_title} (ID: {track_id})")
        
        return JSONResponse({
            "success": True,
            "track_url": track_url,
            "title": track_title,
            "artist": artist_name,
            "album": album_title,
            "duration": duration,
            "track_id": track_id
        })
        
    except requests.exceptions.Timeout:
        logger.error("Deezer API timeout")
        return JSONResponse({
            "success": False,
            "error": "Deezer API timeout"
        }, status_code=504)
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
