const fs = require('fs');

let content = fs.readFileSync('lib/searchMode.js', 'utf8');

// Add aggressive debug logging right after Deemix call
const target = 'const deemixResult = await searchFromDeemix(query);';
const replacement = `const deemixResult = await searchFromDeemix(query);
            console.log('=== DEEMIX DEBUG START ===');
            console.log('deemixResult:', JSON.stringify(deemixResult, null, 2));
            console.log('deemixResult.url:', deemixResult?.url);
            console.log('=== DEEMIX DEBUG END ===');`;

content = content.replace(target, replacement);

fs.writeFileSync('lib/searchMode.js', content, 'utf8');
console.log('✅ Added detailed Deemix debug logging');
