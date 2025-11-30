const axios = require('axios');

const PRIMARY_URL = process.env.DEEMIX_SERVICE_URL_PRIMARY || '';
const SECONDARY_URL = process.env.DEEMIX_SERVICE_URL_SECONDARY || '';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Search for track on Deemix service (returns URL for yt-dlp)
 */
async function searchFromService(serviceUrl, query) {
    try {
        console.log(`Searching Deemix from ${serviceUrl}: ${query}`);

        const response = await axios.post(
            `${serviceUrl}/search`,
            { query: query },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (response.data.success && response.data.track_url) {
            console.log(`✅ Deemix found: ${response.data.artist} - ${response.data.title}`);
            return {
                title: `${response.data.artist} - ${response.data.title}`,
                url: response.data.track_url,
                duration: response.data.duration,
                extractor: 'deezer',
                artist: response.data.artist,
                trackTitle: response.data.title
            };
        } else {
            console.log(`Deemix search failed: ${response.data.error || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Deemix timeout for ${serviceUrl}`);
        } else if (error.response) {
            console.error(`Deemix error (${error.response.status}): ${error.response.statusText}`);
        } else {
            console.error(`Deemix network error: ${error.message}`);
        }
        return null;
    }
}

/**
 * Search with automatic fallback between services
 */
async function searchWithFallback(query) {
    // Try primary service (Render)
    if (PRIMARY_URL) {
        console.log('Trying primary Deemix service (Render)...');
        const result = await searchFromService(PRIMARY_URL, query);
        if (result) {
            console.log('✅ Primary Deemix service succeeded');
            return result;
        }
        console.log('Primary Deemix service failed, trying secondary...');
    }

    // Try secondary service (Railway)
    if (SECONDARY_URL) {
        console.log('Trying secondary Deemix service (Railway)...');
        const result = await searchFromService(SECONDARY_URL, query);
        if (result) {
            console.log('✅ Secondary Deemix service succeeded');
            return result;
        }
        console.log('Secondary Deemix service failed');
    }

    // Both failed
    if (!PRIMARY_URL && !SECONDARY_URL) {
        console.log('⚠️ No Deemix services configured');
    } else {
        console.log('❌ All Deemix services failed');
    }

    return null;
}

module.exports = {
    searchWithFallback
};
