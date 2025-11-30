import os
import logging
import tempfile
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("streamrip-service")

app = FastAPI(title="Streamrip Download Service")

class DownloadRequest(BaseModel):
    url: str
    quality: str = "mp3"  # mp3 or flac

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    arl_set = bool(os.getenv("DEEZER_ARL"))
    return JSONResponse({
        "status": "healthy",
        "deezer_arl_configured": arl_set,
        "streamrip_version": "python-api"
    })

@app.post("/download")
async def download_track(request: DownloadRequest):
    """
    Download a track from Spotify/Deezer using streamrip Python API.
    Returns the downloaded audio file.
    """
    try:
        logger.info(f"Download request: {request.url}")
        
        # Create temp directory for download
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Use streamrip Python API
            from streamrip.cli.cli import RipCore
            from streamrip.config import Config
            
            # Create streamrip config
            config_dict = {
                "downloads": {
                    "folder": temp_dir,
                    "source_subdirectories": False
                },
                "database": {
                    "enabled": False
                },
                "qobuz": {"enabled": False},
                "tidal": {"enabled": False},
                "deezer": {
                    "enabled": True,
                    "arl": os.getenv("DEEZER_ARL", ""),
                },
                "soundcloud": {"enabled": False},
                "youtube": {"enabled": False}
            }
            
            config = Config(config_dict)
            
            # Initialize and run download
            logger.info(f"Downloading with streamrip API: {request.url}")
            
            core = RipCore(config)
            await core.async_download(request.url)
            
            # Find downloaded file
            downloaded_files = list(Path(temp_dir).rglob("*.*"))
            audio_files = [
                f for f in downloaded_files 
                if f.suffix.lower() in ['.mp3', '.flac', '.m4a', '.opus']
            ]
            
            if not audio_files:
                logger.error("No audio file found after download")
                raise HTTPException(
                    status_code=404,
                    detail="Track not found or download failed"
                )
            
            # Return the first audio file found
            audio_file = audio_files[0]
            logger.info(f"Sending file: {audio_file.name} ({audio_file.stat().st_size} bytes)")
            
            return FileResponse(
                path=str(audio_file),
                media_type="audio/mpeg" if audio_file.suffix == ".mp3" else "audio/flac",
                filename=audio_file.name,
                background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
            )
            
        except ImportError as e:
            logger.error(f"Streamrip import error: {str(e)}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=500,
                detail=f"Streamrip library not available: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=500,
                detail=f"Download failed: {str(e)}"
            )
            
    except Exception as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
