import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import traceback

# Deezer API import
try:
    from deezer import Deezer
except ImportError as e:
    logging.error(f"Failed to import Deezer: {e}")
    logging.error("Install with: pip install -r requirements.txt")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Deemix Audio Download Service",
    description="High-quality audio download service using Deemix",
    version="1.0.0"
)


class DownloadRequest(BaseModel):
    query: str
    timeout: Optional[int] = 60


class DownloadResponse(BaseModel):
    success: bool
    track_url: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None
    duration: Optional[int] = None
    track_id: Optional[str] = None
    error: Optional[str] = None


# Global Deezer client
dz: Optional[Deezer] = None


def initialize_deezer():
    """Initialize Deezer client with ARL from environment"""
    global dz
    
    arl = os.getenv('DEEZER_ARL')
    if not arl:
        logger.error("DEEZER_ARL environment variable not set!")
        return False
    
    try:
        dz = Deezer()
        login_success = dz.login_via_arl(arl)
        
        if login_success:
            logger.info("✅ Successfully logged into Deezer")
            return True
        else:
            logger.error("❌ Failed to login to Deezer - ARL may be invalid or expired")
            return False
    except Exception as e:
        logger.error(f"❌ Deezer initialization error: {e}")
        logger.error(traceback.format_exc())
        return False


@app.on_event("startup")
async def startup_event():
    """Initialize Deezer on startup"""
    logger.info("🚀 Starting Deemix Service...")
    success = initialize_deezer()
    if not success:
        logger.warning("⚠️ Service started but Deezer login failed - check DEEZER_ARL")


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Deemix Audio Download Service",
        "version": "1.0.0",
        "status": "online",
        "deezer_logged_in": dz is not None and dz.logged_in if dz else False
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    if not dz or not dz.logged_in:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "reason": "Deezer not logged in - check DEEZER_ARL",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    return {
        "status": "healthy",
        "deezer_logged_in": True,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/download", response_model=DownloadResponse)
async def download_track(request: DownloadRequest):
    """
    Search for a track on Deezer and return its metadata
    
    Args:
        query: Track name and artist (e.g., "Kendrick Lamar HUMBLE")
        timeout: Not used in this version
    
    Returns:
        DownloadResponse with track metadata and URL
    """
    if not dz or not dz.logged_in:
        raise HTTPException(
            status_code=503,
            detail="Deezer not available - service unhealthy"
        )
    
    logger.info(f"📥 Search request: {request.query}")
    
    try:
        # Search for track on Deezer
        search_results = dz.api.search_track(request.query, limit=1)
        
        if not search_results or 'data' not in search_results or len(search_results['data']) == 0:
            logger.warning(f"❌ No results found for: {request.query}")
            return DownloadResponse(
                success=False,
                error=f"No results found on Deezer for: {request.query}"
            )
        
        track = search_results['data'][0]
        track_id = str(track['id'])
        track_title = track.get('title', 'Unknown')
        track_artist = track.get('artist', {}).get('name', 'Unknown')
        track_duration = track.get('duration', 0)
        track_url = f"https://www.deezer.com/track/{track_id}"
        
        logger.info(f"✅ Found: {track_artist} - {track_title} (ID: {track_id})")
        
        return DownloadResponse(
            success=True,
            track_url=track_url,
            title=track_title,
            artist=track_artist,
            duration=track_duration,
            track_id=track_id
        )
        
    except Exception as e:
        logger.error(f"❌ Search error: {e}")
        logger.error(traceback.format_exc())
        return DownloadResponse(
            success=False,
            error=f"Search failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
