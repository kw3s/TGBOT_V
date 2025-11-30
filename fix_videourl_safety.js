const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Fix 1: Add safety check - if videoUrl is empty but meta.url exists, use it
const oldCheck = 'if (videoUrl === undefined && meta && meta.filePath) {';
const newCheck = `// Safety check: if videoUrl is somehow empty, try to get it from meta
        if (!videoUrl && meta && meta.url) {
            console.log('⚠️ videoUrl was empty, recovering from meta.url');
            videoUrl = meta.url;
        }
        
        if (videoUrl === undefined && meta && meta.filePath) {`;

content = content.replace(oldCheck, newCheck);

// Fix 2: Add better debug before yt-dlp runs
const oldYtdlpArgs = 'const args = [\n                videoUrl,';
const newYtdlpArgs = `console.log(\`DEBUG: About to run yt-dlp with videoUrl: "\${videoUrl}"\`);
            const args = [
                videoUrl,`;

content = content.replace(oldYtdlpArgs, newYtdlpArgs);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Added videoUrl safety check and debug!');
