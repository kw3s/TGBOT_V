@echo off
echo ========================================
echo Git Commit: /logs + Link Processing Fixes
echo ========================================
echo.

cd /d "%~dp0"

echo Adding files...
git add lib/logger.js lib/searchMode.js api/webhook.js package.json

echo.
echo Committing...
git commit -m "feat: Add /logs command and fix link processing" -m "- Added circular buffer logging system (lib/logger.js)" -m "- Added /logs command for admin debugging" -m "- Fixed DSP link processing (HTML entities, en-dash support)" -m "- Added Apple Music specific pattern handling" -m "- Cleaned error messages" -m "- Added 'he' dependency for HTML decoding"

echo.
echo Pushing to remote...
git push

echo.
echo ========================================
echo Done! Files committed and pushed.
echo ========================================
pause
