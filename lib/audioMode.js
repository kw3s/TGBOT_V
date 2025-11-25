const { mergeAudioImage } = require('./ffmpegUtils');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

// Helper to download file (Duplicated for safety, can be refactored later)
async function downloadFile(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function handleAudioMode(bot, msg) {
    const chatId = msg.chat.id;

    // 1. Check if user sent an Audio file
    if (msg.audio) {
        const audio = msg.audio;
        const fileId = audio.file_id;

        // Try to get metadata from the audio file
        let query = "";
        if (audio.performer && audio.title) {
            query = `${audio.performer} ${audio.title}`;
        } else if (audio.title) {
            query = audio.title;
        } else {
            // If no metadata, ask user for it
            // For MVP, we'll just try to search with filename or ask user.
            // Let's ask user if we can't find it, OR just default to a generic search if filename exists.
            if (audio.file_name) {
                query = audio.file_name.replace(/\.[^/.]+$/, ""); // remove extension
            } else {
                await bot.sendMessage(chatId, "❌ I couldn't find Artist/Title tags in this file.\nPlease reply to this message with: `Artist - Title`", { parse_mode: 'Markdown' });
                return;
            }
        }

        await bot.sendMessage(chatId, `🔍 Searching Deezer for: "${query}"...`);

        try {
            // 2. Search Deezer
            const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
            const searchRes = await axios.get(searchUrl);

            let coverUrl;
            let trackTitle;

            if (!searchRes.data.data || searchRes.data.data.length === 0) {
                await bot.sendMessage(chatId, "⚠️ No cover art found on Deezer. Using default.");
                coverUrl = "https://placehold.co/600x600/1a1a1a/ffffff?text=No+Cover";
                trackTitle = query || "Unknown Track";
            } else {
                const track = searchRes.data.data[0];
                coverUrl = track.album.cover_big;
                trackTitle = `${track.artist.name} - ${track.title}`;

                // Verify the match is reasonable if we have performer info
                if (audio.performer) {
                    const queryArtist = audio.performer.toLowerCase();
                    const foundArtist = track.artist.name.toLowerCase();

                    // If artists don't match at all, try searching with both artist and title
                    if (!foundArtist.includes(queryArtist) && !queryArtist.includes(foundArtist)) {
                        console.log(`Artist mismatch: expected "${audio.performer}", got "${track.artist.name}". Trying refined search...`);

                        // Try again with explicit artist + title
                        const refinedQuery = `${audio.performer} ${audio.title}`;
                        const refinedUrl = `https://api.deezer.com/search?q=${encodeURIComponent(refinedQuery)}&limit=1`;
                        const refinedRes = await axios.get(refinedUrl);

                        if (refinedRes.data.data && refinedRes.data.data.length > 0) {
                            const refinedTrack = refinedRes.data.data[0];
                            coverUrl = refinedTrack.album.cover_big;
                            trackTitle = `${refinedTrack.artist.name} - ${refinedTrack.title}`;
                        }
                    }
                }
            }

            await bot.sendMessage(chatId, `✅ Found: ${trackTitle}\n⬇️ Downloading...`);

            // 3. Download Files
            const tmpDir = os.tmpdir();
            const imagePath = path.join(tmpDir, `cover_${fileId}.jpg`);
            const audioPath = path.join(tmpDir, `audio_${fileId}.mp3`);
            const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);

            // Get Telegram Audio Link
            const audioLink = await bot.getFileLink(fileId);

            await Promise.all([
                downloadFile(coverUrl, imagePath),
                downloadFile(audioLink, audioPath)
            ]);

            const { startAnimation } = require('./animation');

            const processingMsg = await bot.sendMessage(chatId, "Merging... 🎬");
            const stopAnimation = await startAnimation(bot, chatId, processingMsg.message_id, "Merging...");

            // 4. Merge
            await mergeAudioImage(imagePath, audioPath, outputPath);

            stopAnimation();

            // 5. Send
            await bot.sendMessage(chatId, "🚀 Uploading...");
            await bot.sendVideo(chatId, fs.createReadStream(outputPath), {
                caption: `🎵 ${trackTitle}\nGenerated by VidGen5`
            });

            // 6. Cleanup
            fs.unlinkSync(imagePath);
            fs.unlinkSync(audioPath);
            fs.unlinkSync(outputPath);

        } catch (error) {
            console.error("Error in Audio Mode:", error);
            await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
        return;
    }

    // Handle Text Reply (Metadata correction)
    if (msg.reply_to_message && msg.reply_to_message.from.is_bot && msg.text) {
        // If user replies with text, we could use that as the query.
        // But we need the audio file ID. 
        // Stateless problem: We don't have the audio file ID anymore unless we stored it or passed it.
        // For MVP, let's just ask them to resend audio if metadata is missing.
        await bot.sendMessage(chatId, "Please send the Audio file again.");
        return;
    }

    // Default Instruction
    await bot.sendMessage(chatId, "🎵 Audio Only Mode\n\nPlease send me an Audio file (MP3/M4A). I will automatically find the cover art.");
}

module.exports = { handleAudioMode };
