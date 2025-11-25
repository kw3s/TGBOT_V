const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const os = require('os');

// Test Inputs
const SEARCH_QUERY = "Mozart Symphony 40";

// Helper to download file
async function downloadFile(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Helper to ensure yt-dlp binary exists
async function ensureYtDlp(tmpDir) {
    const isWindows = os.platform() === 'win32';
    const binaryName = isWindows ? "yt-dlp.exe" : "yt-dlp_linux";
    const binaryUrl = isWindows
        ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
        : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

    const binaryPath = path.join(tmpDir, binaryName);

    if (!fs.existsSync(binaryPath)) {
        console.log(`Downloading yt-dlp binary (${binaryName})...`);
        await downloadFile(binaryUrl, binaryPath);
        if (!isWindows) fs.chmodSync(binaryPath, '755');
        console.log("yt-dlp downloaded.");
    }
    return binaryPath;
}

// Helper to search Internet Archive (Mimics searchMode.js logic)
async function searchArchiveOrg(query) {
    try {
        console.log(`Searching Archive.org for: ${query}`);
        const q = encodeURIComponent(`${query} AND mediatype:(audio)`);
        const url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&sort[]=downloads+desc&rows=1&output=json`;

        const response = await axios.get(url);
        if (response.data && response.data.response && response.data.response.docs && response.data.response.docs.length > 0) {
            const doc = response.data.response.docs[0];
            console.log(`   ✅ Found: ${doc.title} (${doc.identifier})`);
            return `https://archive.org/details/${doc.identifier}`;
        } else {
            console.log("   ❌ No results found on Archive.org");
        }
    } catch (e) {
        console.error("Archive.org search failed:", e.message);
    }
    return null;
}

async function run() {
    console.log("🚀 Starting Internet Archive Simulation...");

    try {
        const tmpDir = os.tmpdir();
        const audioPath = path.join(tmpDir, `test_audio_${Date.now()}.mp3`);
        const binaryPath = await ensureYtDlp(tmpDir);

        // 1. Search Archive.org
        const videoUrl = await searchArchiveOrg(SEARCH_QUERY);

        if (!videoUrl) {
            console.error("❌ Could not find video URL. Aborting.");
            return;
        }

        console.log(`\n🧪 TEST: Downloading Audio from ${videoUrl}`);

        const args = [
            videoUrl,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', audioPath,
            '--no-playlist',
            '--no-check-certificate',
            '--ffmpeg-location', path.dirname(ffmpegPath),
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];

        if (process.env.PROXY_URL) {
            console.log("   Using Proxy:", process.env.PROXY_URL);
            args.push('--proxy', process.env.PROXY_URL);
        }

        await new Promise((resolve, reject) => {
            execFile(binaryPath, args, (error, stdout, stderr) => {
                if (error) {
                    console.error("   ❌ yt-dlp error:", stderr);
                    reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
                    return;
                }
                console.log("   ✅ yt-dlp stdout:", stdout);
                resolve();
            });
        });

        console.log("   ✅ Audio downloaded successfully.");

        // Cleanup
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    } catch (e) {
        console.error("❌ Script Error:", e.message);
    }
}

run();
