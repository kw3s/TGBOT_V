const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// CRITICAL FIX: Ensure videoUrl is set from meta when Deemix succeeds
// The issue is that line 496 only runs when OTHER sources are used
// We need to ensure videoUrl is ALWAYS set when meta exists

// Find the section after Deemix sets meta
const oldDeemixBlock = /if \(deemixResult && deemixResult\.url\) \{[\s\S]*?\} else \{\s*logWarn\('Deemix service unavailable or track not found', chatId\);\s*\}/;

const newDeemixBlock = `if (deemixResult && deemixResult.url) {
                logInfo(\`✅ Found on Deezer: \${deemixResult.title}\`, chatId);
                console.log(\`✅ Found on Deezer: \${deemixResult.title}\`);

                // Set videoUrl IMMEDIATELY for yt-dlp
                videoUrl = deemixResult.url;
                videoTitle = deemixResult.title;
                
                // Also set meta for consistency
                meta = {
                    title: deemixResult.title,
                    url: deemixResult.url,
                    extractor: deemixResult.extractor || 'deezer',
                    artist: deemixResult.artist,
                    trackTitle: deemixResult.trackTitle
                };
                
                console.log(\`DEBUG: Set videoUrl to: \${videoUrl}\`);
            } else {
                logWarn('Deezer: Track not found', chatId);
            }`;

content = content.replace(oldDeemixBlock, newDeemixBlock);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Fixed videoUrl assignment in Deemix block!');
