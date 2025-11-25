// Debug Apple Music title
const he = require('he');

const rawTitle = "‎At the Cross (feat. Madison Ryann Ward) – Song by Trip Lee – Apple Music";
console.log('Testing Apple Music title character by character:\n');
console.log('Raw title:', rawTitle);
console.log('\nCharacter codes around en-dashes:');

// Find en-dashes
for (let i = 0; i < rawTitle.length; i++) {
    if (rawTitle[i] === '–' || rawTitle.charCodeAt(i) === 8211) {
        console.log(`\nPosition ${i}: "${rawTitle.substring(i - 3, i + 4)}"`);
        for (let j = i - 3; j <= i + 3; j++) {
            if (j >= 0 && j < rawTitle.length) {
                console.log(`  [${j}] '${rawTitle[j]}' = U+${rawTitle.charCodeAt(j).toString(16).toUpperCase().padStart(4, '0')}`);
            }
        }
    }
}

console.log('\n\nTesting regex patterns:');
const pattern1 = / [–—] Song by (.+?) [–—] Apple Music.*/i;
const pattern2 = /[–—] Song by (.+?)[–—] Apple Music.*/i;
const pattern3 = /\s*[–—]\s*Song by (.+?)\s*[–—]\s*Apple Music.*/i;

console.log('Pattern 1 (with spaces):', pattern1.test(rawTitle), rawTitle.match(pattern1)?.[1]);
console.log('Pattern 2 (no spaces):', pattern2.test(rawTitle), rawTitle.match(pattern2)?.[1]);
console.log('Pattern 3 (flexible spaces):', pattern3.test(rawTitle), rawTitle.match(pattern3)?.[1]);
