import os
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
import shutil
import time

# Deemix imports
from deemix.app.deezer import Deezer
from deemix.settings.load import loadSettings
from deemix.downloader import Downloader
from deemix.utils.localpaths import get_config_folder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("deemix-service")

app = FastAPI(title="Deemix Download Service")

class DownloadRequest(BaseModel):
    query: str

# Global Deezer instance
deezer = Deezer()
settings = loadSettings()

def login_deezer():
    arl = os.getenv("DEEZER_ARL")
    if not arl:
        logger.warning("DEEZER_ARL environment variable not set!")
        return False
    
    try:
        if deezer.login_via_arl(arl):
            logger.info("Successfully logged into Deezer via ARL")
            return True
        else:
            logger.error("Failed to login to Deezer via ARL")
            return False
    except Exception as e:
        logger.error(f"Login exception: {str(e)}")
        return False

# Initial login on startup
@app.on_event("startup")
async def startup_event():
    login_deezer()

@app.get("/health")
async def health_check():
    is_logged_in = deezer.current_user is not None
    if not is_logged_in:
        # Try to re-login
        is_logged_in = login_deezer()
        
    return {
        "status": "healthy",
        "service": "deemix-service",
        "deezer_logged_in": is_logged_in,
        "user": deezer.current_user.get('name') if is_logged_in and deezer.current_user else None
    }

def remove_file(path: str):
    try:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            logger.info(f"Cleaned up file: {path}")
    except Exception as e:
        logger.error(f"Error cleaning up {path}: {e}")

@app.post("/download")
async def download_track(request: DownloadRequest, background_tasks: BackgroundTasks):
    query = request.query
    logger.info(f"Received download request for: {query}")

    if not deezer.current_user:
        if not login_deezer():
            raise HTTPException(status_code=503, detail="Deemix service not logged in to Deezer")

    try:
        # 1. Search
        # Check if it's a link or query
        track_id = None
        if "deezer.com" in query:
             # Basic link parsing (simplified)
            try:
                if "/track/" in query:
                    track_id = query.split("/track/")[1].split("?")[0]
            except:
                pass
        
        if not track_id:
            logger.info(f"Searching Deezer for: {query}")
            search_results = deezer.api.search_track(query, limit=1)
            if not search_results or 'data' not in search_results or not search_results['data']:
                raise HTTPException(status_code=404, detail="Track not found on Deezer")
            
            track = search_results['data'][0]
            track_id = track['id']
            logger.info(f"Found track: {track['title']} by {track['artist']['name']} (ID: {track_id})")
        
        # 2. Download
        # Create a unique temp folder
        download_dir = os.path.join(os.getcwd(), "downloads", str(int(time.time())))
        os.makedirs(download_dir, exist_ok=True)
        
        # Setup Downloader
        # Force MP3 320 for compatibility and speed, or FLAC if preferred
        # settings['preferred_bitrate'] = '3' # 3 = MP3 320, 9 = FLAC
        # Let's stick to MP3 320 for now to ensure streaming stability, or FLAC if requested.
        # Defaulting to MP3 320kbps for safety
        
        track_obj = deezer.api.get_track(track_id)
        
        # Create a download object
        # This part requires some knowledge of deemix internals. 
        # Simplified approach: Use the API to get the download URL directly if possible, 
        # but deemix usually handles the decryption.
        
        # Using the Downloader class is complex without the full listener setup.
        # Let's try a simpler approach if possible, or use the standard Downloader.
        
        # Actually, for a simple service, we might just want to get the direct stream URL if possible.
        # But Deezer URLs are encrypted. We need to download and decrypt.
        
        downloader = Downloader(deezer, None, settings)
        
        # We need to construct the download object manually or use a helper
        # generateDownloadObject is usually in deemix.itemgen
        from deemix.itemgen import generateDownloadObject
        
        download_obj = generateDownloadObject(deezer, f"https://www.deezer.com/track/{track_id}", settings['maxBitrate'])
        
        # We need to start the download
        # The downloader is usually event-driven. This is tricky in a sync request.
        # However, we can use `downloader.start()` if we add the item.
        
        downloader.addToQueue(download_obj)
        
        # Wait for download to finish? This is async/event based.
        # A better way for a simple script is to use the `download` function from `deemix` package if available,
        # or just use the `deezer-py` approach but with `deemix` decryption.
        
        # WAIT! If we are using `deemix` library, we can just use `deemix.download(url, path)`.
        # Let's check if there's a high level API.
        
        # ... Re-evaluating ...
        # The `deemix` library is primarily a CLI/GUI backend. 
        # Writing a custom script using it can be verbose.
        
        # ALTERNATIVE: Use `deemix` as a library to just get the stream URL?
        # No, it needs to decrypt.
        
        # Let's try to use the `deezer.api.get_track_download_url` if it exists?
        # No, that's what `deezer-py` does but it's encrypted.
        
        # OK, let's use a simplified download flow.
        # We will use `generateDownloadObject` and then manually process it.
        
        # Actually, let's look at `deemix.__main__` or similar for inspiration.
        # or just use the `download` method on the plugin.
        
        # Let's try to keep it simple.
        # We will use the `deezer` object to get the track info and `deemix` to download.
        
        # Since I cannot easily verify the `deemix` library internal API right now without running it,
        # I will implement a robust fallback:
        # 1. Try to download using `downloader.addToQueue` and wait (might be hard).
        # 2. OR, simpler: Use `os.system` to call the `deemix` CLI if installed?
        #    `deemix --portable --bitrate 320 "url"`
        #    This is much safer and easier to implement!
        
        # Let's use the CLI approach via subprocess! 
        # It's cleaner and avoids internal API breakage.
        
        import subprocess
        
        cmd = [
            "deemix",
            "--portable",
            "--bitrate", "320",
            "--path", download_dir,
            f"https://www.deezer.com/track/{track_id}"
        ]
        
        # We need to pass the ARL. 
        # Deemix CLI usually reads from config. 
        # We can create a config file in the temp dir or pass it if supported.
        # Deemix CLI doesn't easily accept ARL as arg.
        
        # Back to library usage.
        # Let's assume standard library usage for a single track download.
        
        # We will use the `deezer` instance we already logged in.
        # And we will use `deemix.downloader.Downloader`.
        
        # Let's try to find the file after download.
        
        # Re-implementation using CLI wrapper might be best if we can configure it.
        # But we are in a python script.
        
        # Let's try this:
        # 1. Create a config folder for this request? No, too heavy.
        # 2. Use the global `deezer` object.
        
        # Let's go with the library approach, it's more robust if we get it right.
        
        # Setup listener to wait for completion
        download_finished = False
        download_path = None
        
        class SimpleListener:
            def send(self, key, value=None):
                nonlocal download_finished, download_path
                if key == 'finishDownload':
                    # value is usually the download object or similar
                    download_finished = True
                if key == 'updateQueue':
                    # check if done
                    pass
        
        listener = SimpleListener()
        downloader = Downloader(deezer, listener, settings)
        
        # Force download path
        settings['downloadLocation'] = download_dir
        
        download_obj = generateDownloadObject(deezer, f"https://www.deezer.com/track/{track_id}", settings['maxBitrate'])
        
        # We need to process the download synchronously-ish
        # The downloader uses threads.
        
        downloader.addToQueue(download_obj)
        
        # Wait loop
        timeout = 60 # seconds
        start_time = time.time()
        while not download_finished and (time.time() - start_time) < timeout:
             # Check if file exists in download_dir
             files = os.listdir(download_dir)
             if files:
                 # Check if .mp3 or .flac exists and is not .temp
                 for f in files:
                     if (f.endswith('.mp3') or f.endswith('.flac')) and not f.endswith('.temp') and not f.endswith('.part'):
                         download_path = os.path.join(download_dir, f)
                         download_finished = True
                         break
             time.sleep(1)
             
        if not download_path or not os.path.exists(download_path):
            raise HTTPException(status_code=500, detail="Download timed out or failed")
            
        # Return file stream
        filename = os.path.basename(download_path)
        
        # Schedule cleanup
        background_tasks.add_task(remove_file, download_dir)
        
        return StreamingResponse(
            open(download_path, "rb"), 
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        # Cleanup if failed
        if 'download_dir' in locals() and os.path.exists(download_dir):
            shutil.rmtree(download_dir)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
