const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// CRITICAL FIX: Ensure videoUrl is ALWAYS set from meta.url when Deemix succeeds
// Find the section after meta is set from Deemix and FORCE videoUrl assignment
const target = `            if (deemixResult && deemixResult.url) {
                logInfo(\`✅ Downloaded from Deemix: \${deemixResult.title}\`, chatId);
                console.log(\`✅ Downloaded from Deemix: \${deemixResult.title}\`);

                // Set metadata for downstream logic
                videoTitle = deemixResult.title;
                videoUrl = deemixResult.url;
                meta = {
                    title: deemixResult.title,
                    url: deemixResult.url,
                    extractor: deemixResult.extractor || 'deezer'
                };
            }`;

const replacement = `            if (deemixResult && deemixResult.url) {
                logInfo(\`✅ Found on Deezer: \${deemixResult.title}\`, chatId);
                console.log(\`✅ Found on Deezer: \${deemixResult.title}\`);

                // CRITICAL: Set videoUrl IMMEDIATELY - this is what yt-dlp will use
                videoUrl = deemixResult.url;
                videoTitle = deemixResult.title;
                
                meta = {
                    title: deemixResult.title,
                    url: deemixResult.url,
                    extractor: deemixResult.extractor || 'deezer'
                };
                
                console.log(\`🔥 DEEMIX SUCCESS: videoUrl set to \${videoUrl}\`);
            }`;

content = content.replace(target, replacement);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Applied critical videoUrl fix!');
