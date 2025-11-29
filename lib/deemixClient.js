const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Service URLs from Environment Variables
const PRIMARY_SERVICE_URL = process.env.DEEMIX_SERVICE_URL_PRIMARY;
const SECONDARY_SERVICE_URL = process.env.DEEMIX_SERVICE_URL_SECONDARY;

// Helper to check service health
async function checkHealth(serviceUrl) {
    try {
        const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
        return response.status === 200 && response.data.deezer_logged_in;
    } catch (e) {
        return false;
    }
}

// Helper to download from a specific service
async function downloadFromService(serviceUrl, query) {
    try {
        console.log(`Requesting download from ${serviceUrl} for: "${query}"`);

        const response = await axios.post(`${serviceUrl}/download`, {
            query: query
        }, {
            responseType: 'stream', // Important for binary files
            timeout: 120000 // 2 minutes timeout for download
        });

        // Create temp file
        const tmpDir = os.tmpdir();
        // Extract filename from headers if possible, else generate one
        let filename = `deemix_${Date.now()}.mp3`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+?)"?$/);
            if (match) filename = match[1];
        }

        const filePath = path.join(tmpDir, filename);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Download finished: ${filePath}`);
                resolve({
                    title: filename.replace(/\.[^/.]+$/, ""), // Simple title from filename
                    filePath: filePath,
                    service: serviceUrl,
                    filename: filename
                });
            });
            writer.on('error', (err) => {
                console.error("File write error:", err);
                reject(err);
            });
        });

    } catch (e) {
        console.error(`Error downloading from ${serviceUrl}:`, e.message);
        if (e.response) {
            console.error(`Service responded with status: ${e.response.status}`);
        }
        return null;
    }
}

// Main function with fallback logic
async function downloadWithFallback(query) {
    // 1. Try Primary (Render)
    if (PRIMARY_SERVICE_URL) {
        if (await checkHealth(PRIMARY_SERVICE_URL)) {
            const result = await downloadFromService(PRIMARY_SERVICE_URL, query);
            if (result) return result;
        } else {
            console.warn(`Primary service (${PRIMARY_SERVICE_URL}) is unhealthy or unreachable.`);
        }
    }

    // 2. Try Secondary (Railway)
    if (SECONDARY_SERVICE_URL) {
        console.log("Falling back to secondary service...");
        if (await checkHealth(SECONDARY_SERVICE_URL)) {
            const result = await downloadFromService(SECONDARY_SERVICE_URL, query);
            if (result) return result;
        } else {
            console.warn(`Secondary service (${SECONDARY_SERVICE_URL}) is unhealthy or unreachable.`);
        }
    }

    console.error("All Deemix services failed.");
    return null;
}

module.exports = { downloadWithFallback };
