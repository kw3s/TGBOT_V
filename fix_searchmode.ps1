# Fix searchMode.txt for accuracy improvements
$content = Get-Content lib\searchMode.txt -Raw

# Remove duplicate import
$content = $content -replace 'const \{ downloadWithFallback: downloadFromDeemix \} = require\(''\./deemixClient''\);', ''

# Change downloadFromDeemix to searchFromDeemix
$content = $content -replace 'downloadFromDeemix\(query\)', 'searchFromDeemix(query)'

# Change deemixResult.filePath to deemixResult.url
$content = $content -replace 'deemixResult\.filePath', 'deemixResult.url'

# Save the file
Set-Content lib\searchMode.txt -Value $content -NoNewline

Write-Host "Fixed searchMode.txt"
