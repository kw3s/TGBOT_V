# Complete fix for all 3 files
# Fix audioMode.js outputPath
$content = Get-Content 'lib\audioMode.js' -Raw
$content = $content -creplace 'const outputPath = path\.join\(tmpDir, `output_\$\{Date\.now\(\)\}\.mp4`\);', 'const outputPath = path.join(tmpDir, `${sanitizedTitle}.mp4`);'
Set-Content 'lib\audioMode.js' -Value $content -NoNewline
Write-Host "✅ Fixed audioMode.js outputPath" -ForegroundColor Green

# Fix manualMode.js outputPath
$content = Get-Content 'lib\manualMode.js' -Raw
$content = $content -creplace 'const outputPath = path\.join\(tmpDir, `output_\$\{Date\.now\(\)\}\.mp4`\);', 'const outputPath = path.join(tmpDir, `${sanitizedTitle}.mp4`);'
Set-Content 'lib\manualMode.js' -Value $content -No Newline
Write-Host "✅ Fixed manualMode.js outputPath" -ForegroundColor Green

# Fix searchMode.js completely
$content = Get-Content 'lib\searchMode.js' -Raw
# Add sanitizedTitle line before audioPath
$search = '        // 3. Prepare Paths' + "`r`n" + '        const audioPath'
$replace = '        // 3. Prepare Paths' + "`r`n" + '        const sanitizedTitle = videoTitle.replace(/[<>:"/\|?*]/g, '''').substring(0, 100);' + "`r`n" + '        const audioPath'
$content = $content.Replace($search, $replace)
# Fix outputPath
$content = $content -creplace 'const outputPath = path\.join\(tmpDir, `output_\$\{Date\.now\(\)\}\.mp4`\);', 'const outputPath = path.join(tmpDir, `${sanitizedTitle}.mp4`);'
Set-Content 'lib\searchMode.js' -Value $content -NoNewline
Write-Host "✅ Fixed searchMode.js completely" -ForegroundColor Green

Write-Host "`n✅✅✅ All 3 files updated successfully!" -ForegroundColor Cyan
