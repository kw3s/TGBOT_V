const { Innertube, UniversalCache } = require('youtubei.js');
const { ProxyAgent, fetch } = require('undici');

// Proxy from logs
const PROXY_URL = "http://zasfbuxu:cg3y957i6nhw@31.59.20.176:6754";
const VIDEO_ID = "IEF2rhB3T7I"; // Jackie Hill Perry video from logs

async function test() {
    console.log("Testing youtubei.js with proxy...");

    try {
        const dispatcher = new ProxyAgent(PROXY_URL);
        const fetchClient = (input, init) => {
            // If input is a Request object, extract URL and props
            if (typeof input === 'object' && input.url) {
                return fetch(input.url, {
                    ...init,
                    method: input.method,
                    headers: input.headers,
                    body: input.body,
                    duplex: 'half', // Required for undici
                    dispatcher
                });
            }

            return fetch(input, { ...init, duplex: 'half', dispatcher });
        };

        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
            fetch: fetchClient,
            device_type: 'IOS' // Try IOS client
        });

        console.log("Innertube initialized. Fetching info...");
        const info = await yt.getBasicInfo(VIDEO_ID);
        console.log("Title:", info.basic_info.title);

        console.log("Attempting download stream...");
        const stream = await yt.download(VIDEO_ID, {
            type: 'audio',
            quality: 'best',
            format: 'mp3'
        });

        console.log("Stream obtained successfully!");
        // Consume a bit of stream to ensure it works
        for await (const chunk of stream) {
            console.log("Received chunk of size:", chunk.length);
            break; // Just need one chunk to prove it works
        }
        console.log("Test PASSED! ✅");

    } catch (error) {
        console.error("Test FAILED ❌", error);
    }
}

test();
