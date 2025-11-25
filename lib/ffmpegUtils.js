const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// Tell fluent-ffmpeg where to find the binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Merges an image and an audio file into an MP4 video.
 * @param {string} imagePath - Path to the image file.
 * @param {string} audioPath - Path to the audio file.
 * @param {string} outputPath - Path where the output MP4 should be saved.
 * @returns {Promise<string>} - Resolves with the outputPath on success.
 */
async function mergeAudioImage(imagePath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`Starting merge: ${imagePath} + ${audioPath} -> ${outputPath}`);

        ffmpeg()
            .input(imagePath)
            .inputOptions(['-loop 1']) // Correctly loop the image input
            .input(audioPath)
            .outputOptions([
                '-c:v libx264', // Video codec
                '-preset ultrafast', // Optimize for speed
                '-tune stillimage', // Optimize for still image
                '-c:a aac', // Audio codec
                '-b:a 128k', // Audio bitrate
                '-pix_fmt yuv420p', // Pixel format
                '-r 1', // Force 1 fps (Huge size/speed win for static images)
                '-vf scale=\'min(1280,iw)\':-2', // Max width 1280, keep aspect ratio, even height
                '-shortest' // Finish when audio ends
            ])
            .save(outputPath)
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('error', (err) => {
                console.error('An error occurred: ' + err.message);
                reject(err);
            })
            .on('end', () => {
                console.log('Processing finished !');
                resolve(outputPath);
            });
    });
}

module.exports = { mergeAudioImage };
