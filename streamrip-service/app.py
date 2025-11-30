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
        "streamrip_version": "cli-fixed"
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
            # Create streamrip config in temp directory
            config_dir = Path(temp_dir) / ".config" / "streamrip"
            config_dir.mkdir(parents=True, exist_ok=True)
            
            # Write config.toml
            config_content = f"""
[downloads]
folder = "{temp_dir}"
source_subdirectories = false

[database]
downloads_enabled = false

[conversion]
enabled = false

[qobuz]
enabled = false

[tidal]
enabled = false

[deezer]
enabled = true
arl = "{os.getenv('DEEZER_ARL', '')}"

[soundcloud]
enabled = false

[youtube]
enabled = false

[metadata]
set_playlist_to_album = true

[filepaths]
track_format = "{{artist}} - {{title}}"
"""
            
            config_file = config_dir / "config.toml"
            config_file.write_text(config_content)
            
            # CORRECT USAGE per official docs: rip url <URL> (no extra flags!)
            cmd = ["rip", "url", request.url]
            
            logger.info(f"Running: {' '.join(cmd)}")
            logger.info(f"Config dir: {config_dir}")
            
            # Execute with timeout
            env = os.environ.copy()
            env["HOME"] = temp_dir  # Point to temp config
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
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
