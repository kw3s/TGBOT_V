const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');

const PROXY_URL = "http://zasfbuxu:cg3y957i6nhw@31.59.20.176:6754";
const VIDEO_URL = "https://www.youtube.com/watch?v=IEF2rhB3T7I";
const BINARY_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
const BINARY_PATH = path.join(__dirname, 'yt-dlp_linux');

async function downloadBinary() {
    console.log("Downloading yt-dlp binary...");
    const writer = fs.createWriteStream(BINARY_PATH);
    const response = await axios({
        url: BINARY_URL,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function run() {
    try {
        if (!fs.existsSync(BINARY_PATH)) {
            await downloadBinary();
            fs.chmodSync(BINARY_PATH, '755'); // Make executable
            console.log("Binary downloaded and chmodded.");
        }

        console.log("Running yt-dlp...");
        const args = [
            VIDEO_URL,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', 'test_audio.mp3',
            '--proxy', PROXY_URL,
            '--no-playlist',
            '--no-check-certificate' // Sometimes needed for proxies
        ];

        const child = execFile(BINARY_PATH, args, (error, stdout, stderr) => {
            if (error) {
                console.error("Error:", error);
                console.error("Stderr:", stderr);
                return;
            }
            console.log("Stdout:", stdout);
            console.log("Success! Audio downloaded.");
        });

    } catch (e) {
        console.error("Script failed:", e);
    }
}

run();
