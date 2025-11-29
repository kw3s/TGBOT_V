const axios = require('axios');

/**
 * Deemix Service Client
 * Handles communication with Deemix microservices deployed on Render.com and Railway.app
 */

const PRIMARY_URL = process.env.DEEMIX_SERVICE_URL_PRIMARY || '';
const SECONDARY_URL = process.env.DEEMIX_SERVICE_URL_SECONDARY || '';
const REQUEST_TIMEOUT = 65000; // 65 seconds (service timeout is 60s)

/**
 * Check health of a Deemix service
 * @param {string} serviceUrl - Base URL of the service
 * @returns {Promise<boolean>} - True if healthy, false otherwise
 */
async function checkHealth(serviceUrl) {
    if (!serviceUrl) return false;

    try {
        const response = await axios.get(`${serviceUrl}/health`, {
            timeout: 5000
        });
        return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
        console.error(`Health check failed for ${serviceUrl}:`, error.message);
        return false;
    }
}

/**
 * Download a track from Deemix service
 * @param {string} serviceUrl - Base URL of the service
 * @param {string} query - Song query (e.g., "Artist Name - Track Name")
 * @param {number} timeout - Download timeout in seconds
 * @returns {Promise<Object|null>} - Track metadata or null if failed
 */
async function downloadFromService(serviceUrl, query, timeout = 60) {
    try {
        console.log(`Attempting Deemix download from ${serviceUrl}: ${query}`);

        const response = await axios.post(
            `${serviceUrl}/download`,
            {
                query: query,
                timeout: timeout
            },
            {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success && response.data.track_url) {
            console.log(`✅ Deemix success: ${response.data.artist} - ${response.data.title}`);
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
            console.error(`Deemix error (${error.response.status}): ${error.response.data?.detail || error.message}`);
        } else {
            console.error(`Deemix network error: ${error.message}`);
        }
        return null;
    }
}

/**
 * Download track with automatic fallback between services
 * Tries Primary (Render) → Secondary (Railway) → null
 * @param {string} query - Song query
 * @returns {Promise<Object|null>} - Track metadata or null if all failed
 */
async function downloadWithFallback(query) {
    // Try primary service (Render)
    if (PRIMARY_URL) {
        console.log('Trying primary Deemix service (Render)...');
        const result = await downloadFromService(PRIMARY_URL, query);
        if (result) {
            console.log('✅ Primary Deemix service succeeded');
            return result;
        }
        console.log('Primary Deemix service failed, trying secondary...');
    }

    // Try secondary service (Railway)
    if (SECONDARY_URL) {
        console.log('Trying secondary Deemix service (Railway)...');
        const result = await downloadFromService(SECONDARY_URL, query);
        if (result) {
            console.log('✅ Secondary Deemix service succeeded');
            return result;
        }
        console.log('Secondary Deemix service failed');
    }

    // Both failed
    if (!PRIMARY_URL && !SECONDARY_URL) {
        console.log('⚠️ No Deemix services configured (DEEMIX_SERVICE_URL_PRIMARY/SECONDARY not set)');
    } else {
        console.log('❌ All Deemix services failed');
    }

    return null;
}

/**
 * Check if any Deemix service is available
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
    const primaryHealthy = await checkHealth(PRIMARY_URL);
    const secondaryHealthy = await checkHealth(SECONDARY_URL);
    return primaryHealthy || secondaryHealthy;
}

module.exports = {
    downloadWithFallback,
    checkHealth,
    isAvailable
};
