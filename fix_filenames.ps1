# Fix searchMode.js
$content = Get-Content 'lib\searchMode.js' -Raw
$content = $content -replace '(await bot\.sendMessage\(chatId, ``✅ Found: \$\{videoTitle\}\\n⬇️ Downloading\.\.\.)``\);[\r\n\s]+// 3\. Prepare Paths[\r\n\s]+const audioPath', ('$1`);' + "`r`n`r`n        // 3. Prepare Paths`r`n        const sanitizedTitle = videoTitle.replace(/[<>:`"/\|?*]/g, '''').substring(0, 100);`r`n        const audioPath")
$content = $content -replace 'const outputPath = path\.join\(tmpDir, ``output_\$\{Date\.now\(\)\}\.mp4``\);', 'const outputPath = path.join(tmpDir, ``${sanitizedTitle}.mp4``);'
Set-Content 'lib\searchMode.js' -Value $content -NoNewline

# Fix audioMode.js  
$content = Get-Content 'lib\audioMode.js' -Raw
$content = $content -replace '// 3\. Download Files[\r\n\s]+const tmpDir', ('// 3. Download Files' + "`r`n            const tmpDir")
$content = $content -replace '(const tmpDir = os\.tmpdir\(\);[\r\n\s]+)const imagePath', ('$1const sanitizedTitle = trackTitle.replace(/[<>:`"/\|?*]/g, '''').substring(0, 100);' + "`r`n            const imagePath")
$content = $content -replace 'const outputPath = path\.join\(tmpDir, ``output_\$\{Date\.now\(\)\}\.mp4``\);', 'const outputPath = path.join(tmpDir, ``${sanitizedTitle}.mp4``);'
Set-Content 'lib\audioMode.js' -Value $content -NoNewline

# Fix manualMode.js
$content = Get-Content 'lib\manualMode.js' -Raw
$content = $content -replace '// 2\. Download Files to /tmp[\r\n\s]+(const imagePath)', ('// 2. Download Files to /tmp' + "`r`n                    const audioTitle = msg.audio.title || msg.audio.file_name || 'video';`r`n                    const sanitizedTitle = audioTitle.replace(/[<>:`"/\|?*]/g, '''').substring(0, 100);`r`n                    " + '$1')
$content = $content -replace 'const outputPath = path\.join\(tmpDir, ``output_\$\{Date\.now\(\)\}\.mp4``\);', 'const outputPath = path.join(tmpDir, ``${sanitizedTitle}.mp4``);'
Set-Content 'lib\manualMode.js' -Value $content -NoNewline

Write-Host "✅ All files updated with sanitized filenames!" -ForegroundColor Green
