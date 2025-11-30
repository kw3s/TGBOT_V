import os
import logging
import tempfile
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import subprocess
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
        "streamrip_version": "dev"
    })

@app.post("/download")
async def download_track(request: DownloadRequest):
    """
    Download a track from Spotify/Deezer using streamrip.
    Returns the downloaded audio file.
    """
    try:
        logger.info(f"Download request: {request.url}")
        
        # Create temp directory for download
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Prepare streamrip command
            quality_map = {
                "mp3": "3",  # 320kbps MP3
                "flac": "2"  # FLAC
            }
            quality_code = quality_map.get(request.quality, "3")
            
            # Streamrip dev branch uses different CLI syntax
            # Quality is set in config.toml, just download the URL
            cmd = [
                "rip",
                "url",
                request.url,
                "--directory", temp_dir,
                "--no-db"
            ]
            
            logger.info(f"Running: {' '.join(cmd)}")
            
            # Execute with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=120.0  # 2 minute timeout
            )
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"Streamrip failed: {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Download failed: {error_msg}"
                )
            
            # Find downloaded file
            downloaded_files = list(Path(temp_dir).rglob("*.*"))
            audio_files = [
                f for f in downloaded_files 
                if f.suffix.lower() in ['.mp3', '.flac', '.m4a']
            ]
            
            if not audio_files:
                logger.error("No audio file found after download")
                raise HTTPException(
                    status_code=404,
                    detail="Track not found or download failed"
                )
            
            # Return the first audio file found
            audio_file = audio_files[0]
            logger.info(f"Sending file: {audio_file.name}")
            
            return FileResponse(
                path=str(audio_file),
                media_type="audio/mpeg" if audio_file.suffix == ".mp3" else "audio/flac",
                filename=audio_file.name,
                background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
            )
            
        except asyncio.TimeoutError:
            logger.error("Download timeout")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=504,
                detail="Download timeout (>2 minutes)"
            )
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
            
    except Exception as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
