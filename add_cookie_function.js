const fs = require('fs');

// Read file
let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Find where to insert the function (after searchArchiveOrg function)
const insertAfter = 'return null;\n}\n\n';
const functionToAdd = `// Helper to create Deezer cookie file from ARL
function createDeezerCookieFile(arl, tmpDir) {
    if (!arl) return null;

    const cookieFilePath = path.join(tmpDir, \`deezer_cookies_\${Date.now()}.txt\`);

    // Netscape cookie format for Deezer ARL
    const cookieContent = [
        '# Netscape HTTP Cookie File',
        '# This file was generated for yt-dlp',
        '.deezer.com\\tTRUE\\t/\\tTRUE\\t0\\tarl\\t' + arl
    ].join('\\n');

    fs.writeFileSync(cookieFilePath, cookieContent);
    return cookieFilePath;
}

`;

// Insert the function
const insertIndex = content.lastIndexOf(insertAfter);
if (insertIndex !== -1) {
    content = content.slice(0, insertIndex + insertAfter.length) + functionToAdd + content.slice(insertIndex + insertAfter.length);
    fs.writeFileSync('lib/searchMode.js', content, 'utf8');
    console.log('✅ Added createDeezerCookieFile function!');
} else {
    console.log('❌ Could not find insertion point');
}
