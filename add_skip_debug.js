const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Add logging right before skipYtDlp check
const target = '        if (skipYtDlp) {';
const replacement = `        console.log('DEBUG: About to check skipYtDlp, value =', skipYtDlp);
        console.log('DEBUG: videoUrl before yt-dlp section =', videoUrl);
        if (skipYtDlp) {`;

content = content.replace(target, replacement);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Added skipYtDlp check logging!');
