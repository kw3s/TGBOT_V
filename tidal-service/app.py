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
logger = logging.getLogger("tidal-service")

app = FastAPI(title="Tidal Download Service")

class DownloadRequest(BaseModel):
    url: str
    quality: str = "hires"  # hires, master, or high

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    token_set = bool(os.getenv("TIDAL_TOKEN"))
    return JSONResponse({
        "status": "healthy",
        "tidal_token_configured": token_set,
        "service": "tidal-dl-ng"
    })

@app.post("/download")
async def download_track(request: DownloadRequest):
    """
    Download a track from Tidal using tidal-dl-ng.
    Returns the downloaded audio file.
    """
    try:
        logger.info(f"Download request: {request.url}")
        
        # Create temp directory for download
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Prepare tidal-dl-ng command
            quality_map = {
                "high": "HIGH",
                "hires": "LOSSLESS", 
                "master": "HI_RES"
            }
            quality_level = quality_map.get(request.quality, "LOSSLESS")
            
            # Run tidal-dl-ng
            cmd = [
                "tidal-dl",
                "-u", request.url,
                "-q", quality_level,
                "-o", temp_dir
            ]
            
            logger.info(f"Running: {' '.join(cmd)}")
            
            # Execute with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "TIDAL_TOKEN": os.getenv("TIDAL_TOKEN", "")}
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=180.0  # 3 minute timeout for HiRes files
            )
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"tidal-dl failed: {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Download failed: {error_msg}"
                )
            
            # Find downloaded file
            downloaded_files = list(Path(temp_dir).rglob("*.*"))
            audio_files = [
                f for f in downloaded_files 
                if f.suffix.lower() in ['.flac', '.m4a', '.mp3', '.aac']
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
            
            # Determine media type
            media_type_map = {
                '.flac': 'audio/flac',
                '.m4a': 'audio/mp4',
                '.mp3': 'audio/mpeg',
                '.aac': 'audio/aac'
            }
            media_type = media_type_map.get(audio_file.suffix.lower(), 'audio/flac')
            
            return FileResponse(
                path=str(audio_file),
                media_type=media_type,
                filename=audio_file.name,
                background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
            )
            
        except asyncio.TimeoutError:
            logger.error("Download timeout")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(
                status_code=504,
                detail="Download timeout (>3 minutes)"
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
