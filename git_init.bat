@echo off
echo ========================================
echo Git Setup: Initialize Repository
echo ========================================
echo.

cd /d "%~dp0"

echo Initializing git repository...
git init

echo.
echo Adding files...
git add lib/logger.js lib/searchMode.js api/webhook.js package.json

echo.
echo Creating initial commit...
git commit -m "feat: Add /logs command and fix link processing" -m "- Added circular buffer logging system (lib/logger.js)" -m "- Added /logs command for admin debugging" -m "- Fixed DSP link processing (HTML entities, en-dash support)" -m "- Added Apple Music specific pattern handling" -m "- Cleaned error messages" -m "- Added 'he' dependency for HTML decoding"

echo.
echo ========================================
echo Git repository initialized!
echo ========================================
echo.
echo Next steps:
echo 1. Create a GitHub repository (if you haven't already)
echo 2. Copy the repository URL
echo 3. Run: git remote add origin YOUR_REPO_URL
echo 4. Run: git push -u origin main
echo.
echo OR just run deploy.bat to deploy to Vercel!
echo ========================================
pause
