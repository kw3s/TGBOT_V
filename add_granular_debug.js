const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Find the cookie injection section and add granular logging
const oldCookieCheck = `console.log('DEBUG: videoUrl =', videoUrl);
            console.log('DEBUG: Has DEEZER_ARL?', !!process.env.DEEZER_ARL);
            if (videoUrl && videoUrl.includes('deezer.com') && process.env.DEEZER_ARL) {`;

const newCookieCheck = `console.log('=== COOKIE INJECTION DEBUG ===');
            console.log('DEBUG: videoUrl =', videoUrl);
            console.log('DEBUG: videoUrl type =', typeof videoUrl);
            console.log('DEBUG: videoUrl truthy?', !!videoUrl);
            console.log('DEBUG: includes deezer.com?', videoUrl ? videoUrl.includes('deezer.com') : 'N/A');
            console.log('DEBUG: DEEZER_ARL exists?', !!process.env.DEEZER_ARL);
            console.log('DEBUG: DEEZER_ARL value:', process.env.DEEZER_ARL ? '(set)' : '(not set)');
            
            if (videoUrl && videoUrl.includes('deezer.com') && process.env.DEEZER_ARL) {`;

content = content.replace(oldCookieCheck, newCookieCheck);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Added granular cookie injection logging!');
