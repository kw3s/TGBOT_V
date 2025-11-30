const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Add debug logging after Deemix call
const deemixCallLine = 'const deemixResult = await searchFromDeemix(query);';
const debugAfterDeemix = `const deemixResult = await searchFromDeemix(query);
            console.log('DEBUG: Deemix result:', JSON.stringify(deemixResult, null, 2));`;

content = content.replace(deemixCallLine, debugAfterDeemix);

// Add debug logging before cookie injection
const cookieCheckLine = 'if (videoUrl && videoUrl.includes(\'deezer.com\') && process.env.DEEZER_ARL) {';
const debugBeforeCookie = `console.log('DEBUG: videoUrl =', videoUrl);
            console.log('DEBUG: Has DEEZER_ARL?', !!process.env.DEEZER_ARL);
            if (videoUrl && videoUrl.includes('deezer.com') && process.env.DEEZER_ARL) {`;

content = content.replace(cookieCheckLine, debugBeforeCookie);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Added debug logging!');
