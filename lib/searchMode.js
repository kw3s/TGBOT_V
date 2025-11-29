const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const he = require('he');
const { execFile } = require('child_process');
const { mergeAudioImage } = require('./ffmpegUtils');
const { startAnimation } = require('./animation');
const ffmpegPath = require('ffmpeg-static');
const { logInfo, logWarn, logError } = require('./logger');
const { downloadWithFallback: downloadFromDeemix } = require('./deemixClient');

// Constants
const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
const YTDLP_FILENAME = "yt-dlp_linux_new";

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
        response.data.on('error', reject);
    });
}

// Helper to ensure yt-dlp binary exists
async function ensureYtDlp(tmpDir) {
    const binaryPath = path.join(tmpDir, YTDLP_FILENAME);
    if (!fs.existsSync(binaryPath)) {
        console.log("Downloading yt-dlp binary...");
        await downloadFile(YTDLP_URL, binaryPath);
        fs.chmodSync(binaryPath, '755');
        console.log("yt-dlp downloaded and chmodded.");
    }
    return binaryPath;
}

// Helper to get Cover from Deezer
async function getDeezerCover(query) {
    try {
        const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
        const response = await axios.get(searchUrl);
        if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0].album.cover_big;
        }
    } catch (e) {
        console.error("Deezer search failed:", e.message);
    }
    return null;
}

// Helper to get Spotify access token
let spotifyTokenCache = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return null;
    }

    // Return cached token if still valid
    if (spotifyTokenCache && Date.now() < spotifyTokenExpiry) {
        return spotifyTokenCache;
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        spotifyTokenCache = response.data.access_token;
        spotifyTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1min buffer
        return spotifyTokenCache;
    } catch (e) {
        console.error('Spotify token error:', e.message);
        return null;
    }
}

// Helper to get cover from Spotify Web API
async function getSpotifyCover(trackName, artistName) {
    try {
        const token = await getSpotifyToken();
        if (!token) return null;

        const query = artistName
            ? encodeURIComponent(`track:${trackName} artist:${artistName}`)
            : encodeURIComponent(trackName);
        const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

        const response = await axios.get(searchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.tracks && response.data.tracks.items.length > 0) {
            const track = response.data.tracks.items[0];
            const coverUrl = track.album.images[0]?.url;
            if (coverUrl) {
                console.log(`Spotify: Found "${track.name}" by ${track.artists[0].name}`);
                return coverUrl;
            }
        }
    } catch (e) {
        console.error("Spotify search failed:", e.message);
    }
    return null;
}


// Helper to search Internet Archive
async function searchArchiveOrg(query) {
    try {
        const q = encodeURIComponent(`${query} AND mediatype:(audio)`);
        // Get top 5 results to check for relevance
        const url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&sort[]=downloads+desc&rows=5&output=json`;

        const response = await axios.get(url);
        if (response.data && response.data.response && response.data.response.docs && response.data.response.docs.length > 0) {
            // Check multiple results for relevance
            for (const doc of response.data.response.docs) {
                // Strict match check - only accept if title is relevant to query
                if (isStrictMatch(doc.title, query)) {
                    console.log(`Archive.org: Found relevant match "${doc.title}" for "${query}"`);
                    return {
                        title: doc.title,
                        url: `https://archive.org/details/${doc.identifier}`,
                        extractor: 'archive.org'
                    };
                }
            }

            // If no strict match found, reject Archive result
            console.log(`Archive.org: No relevant match found for "${query}" (checked ${response.data.response.docs.length} results)`);
            return null;
        }
    } catch (e) {
        console.error("Archive.org search failed:", e.message);
    }
    return null;
}

// Helper to create Deezer cookie file from ARL
function createDeezerCookieFile(arl, tmpDir) {
    if (!arl) return null;

    const cookieFilePath = path.join(tmpDir, `deezer_cookies_${Date.now()}.txt`);

    // Netscape cookie format for Deezer ARL
    const cookieContent = [
        '# Netscape HTTP Cookie File',
        '# This file was generated for yt-dlp',
        '.deezer.com\tTRUE\t/\tTRUE\t0\tarl\t' + arl
    ].join('\n');

    console.log(`Searching SoundCloud for: ${query}`);
    meta = await getMetadata(query, binaryPath, 'soundcloud');

    if (meta) {
        const isMatch = isStrictMatch(meta.title, trackNameForCheck, artistForCheck);
        const isPreview = meta.duration && meta.duration < 45;

        if (!isMatch) {
            logWarn(`SoundCloud: "${meta.title}" did not match "${trackNameForCheck}"`, chatId);
            console.log(`SoundCloud result "${meta.title}" did not match "${trackNameForCheck}"`);
        }
        if (isPreview) {
            logWarn('SoundCloud result is a preview', chatId);
            console.log("SoundCloud result is a preview.");
        }

        if (!isMatch || isPreview) {
            meta = null;
        } else {
            logInfo(`✅ Found on SoundCloud: ${meta.title}`, chatId);
        }
    }
}

// C. YouTube Fallback
if (!meta) {
    logInfo('Falling back to YouTube', chatId);
    console.log("Falling back to YouTube...");
    meta = await getMetadata(query, binaryPath, 'youtube');
    if (meta) {
        logInfo(`✅ Found on YouTube: ${meta.title}`, chatId);
    }
}

// D. Internet Archive Fallback
if (!meta) {
    logInfo('Falling back to Internet Archive', chatId);
    console.log("Falling back to Internet Archive...");
    meta = await getMetadata(query, binaryPath, 'archive');
    if (meta) {
        logInfo(`✅ Found on Archive: ${meta.title}`, chatId);
    }
}

if (!meta) {
    logWarn('No match found on any source', chatId);

    if (isDspLink) {
        await bot.sendMessage(chatId, "No match found 💔\n\n💡 Tip: Try typing the 'Track Name Artist' manually.");
    } else {
        await bot.sendMessage(chatId, "Sorry, better luck next time! 😞");
    }

    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    return;
}
videoUrl = meta.url;
videoTitle = meta.title;
        }


// Find Cover Art - use Spotify with artist-aware search
coverUrl = null;
let trackName = null;
let artistName = null;

// Parse track and artist from original query (before audio search modified it)
// For "40 Kijan Boone" or DSP link parsed as "40 by Kijan Boone"
if (query) {
    const parts = query.split(/\s+(?:by|-|–)\s+/i);
    if (parts.length >= 2) {
        trackName = parts[0].trim();
        artistName = parts.slice(1).join(' ').trim();
    } else {
        trackName = query.trim();
    }
}

// Try Spotify first (best quality, most accurate)
if (trackName) {
    console.log(`Searching Spotify cover: "${trackName}" by "${artistName || 'unknown'}"`);
    coverUrl = await getSpotifyCover(trackName, artistName);
    if (coverUrl) {
        console.log(`✅ Cover from Spotify`);
    }
}

// Fallback to Deezer
if (!coverUrl) {
    console.log(`Trying Deezer for: ${query}`);
    coverUrl = await getDeezerCover(query);
    if (coverUrl) {
        console.log(`✅ Cover from Deezer`);
    }
}

// Final fallback
if (!coverUrl) {
    console.log("No cover found, using placeholder.");
    coverUrl = "https://placehold.co/600x600/1a1a1a/ffffff?text=No+Cover";
}

await bot.sendMessage(chatId, `✅ Found: ${videoTitle}\n⬇️ Downloading...`);

// 3. Prepare Paths
const sanitizedTitle = videoTitle.replace(/[<>:"/\|?*]/g, '').substring(0, 100);
const audioPath = path.join(tmpDir, `audio_${Date.now()}.mp3`);
const imagePath = path.join(tmpDir, `cover_${Date.now()}.jpg`);
const outputPath = path.join(tmpDir, `${sanitizedTitle}.mp4`);

console.log("Step 3: Downloading Assets...");

// Download Cover
try {
    await downloadFile(coverUrl, imagePath);
} catch (e) {
    console.error("Failed to download cover:", e.message);
}

// 4. Download Audio via yt-dlp Binary
console.log("Running yt-dlp...");
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

// Add Proxy
if (process.env.PROXY_URL) {
    const proxies = process.env.PROXY_URL.split(',').map(p => p.trim()).filter(p => p);
    if (proxies.length > 0) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        console.log(`Using Proxy: ${randomProxy}`);
        args.push('--proxy', randomProxy);
    }
}

// Add Android Client if YouTube
if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    args.push('--extractor-args', 'youtube:player_client=android');
}


await new Promise((resolve, reject) => {
    execFile(binaryPath, args, (error, stdout, stderr) => {
        if (error) {
            console.error("yt-dlp error:", stderr);
            reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
            return;
        }
        console.log("yt-dlp stdout:", stdout);
        resolve();
    });
});
console.log("Audio downloaded.");

// 5. Merge - with validation to prevent code 234
console.log("Step 4: Merging...");

// Clean up any existing output file
if (fs.existsSync(outputPath)) {
    try {
        fs.unlinkSync(outputPath);
        console.log("Deleted existing output file.");
    } catch (e) {
        console.error("Failed to delete existing output:", e);
    }
}

// Validate input files exist and have content
const audioExists = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0;
const imageExists = fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0;

if (!audioExists) {
    throw new Error("Audio download failed (empty or missing file).");
}
if (!imageExists) {
    throw new Error("Cover image download failed (empty or missing file).");
}

const audioSize = fs.statSync(audioPath).size;
const imageSize = fs.statSync(imagePath).size;
console.log(`Input files validated: audio=${(audioSize / 1024).toFixed(1)}KB, image=${(imageSize / 1024).toFixed(1)}KB`);

const { startAnimation } = require('./animation');
const processingMsg = await bot.sendMessage(chatId, "Merging... 🎬");
const stopAnimation = await startAnimation(bot, chatId, processingMsg.message_id, "Merging...");

try {
    await mergeAudioImage(imagePath, audioPath, outputPath);
    stopAnimation();

    // Verify output was created
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new Error('Merge completed but output file is missing or empty');
    }

    const outputSize = fs.statSync(outputPath).size;
    console.log(`Merge successful: ${(outputSize / 1024 / 1024).toFixed(2)}MB`);
    logInfo(`Video generated: ${(outputSize / 1024 / 1024).toFixed(2)}MB`, chatId);

} catch (mergeError) {
    stopAnimation();
    logError(`Merge failed: ${mergeError.message}`, chatId);
    throw mergeError;
}

// 6. Send
await bot.sendMessage(chatId, "🚀 Uploading...");
await bot.sendVideo(chatId, fs.createReadStream(outputPath), {
    caption: `🎵 ${videoTitle}\nGenerated by VidGen5`
});

// 7. Cleanup
if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);

logInfo(`✅ Video generated successfully: ${videoTitle}`, chatId);

    } catch (error) {
    logError(`Error in Search Mode: ${error.message}`, chatId, { stack: error.stack });
    console.error("Error in Search Mode:", error);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
}
}

module.exports = { handleSearchMode };