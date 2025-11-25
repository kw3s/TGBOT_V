@echo off
echo ========================================
echo Cleaning up repository
echo ========================================
echo.

cd /d "%~dp0"

echo Removing test and debug files from git...
git rm --cached test_*.js 2>nul
git rm --cached debug_*.js 2>nul
git rm --cached *_test.js 2>nul
git rm --cached *.test.js 2>nul
git rm --cached Logs.txt 2>nul
git rm --cached prompt.txt 2>nul

echo.
echo Committing cleanup...
git commit -m "chore: Remove test files and logs from repository"

echo.
echo Pushing to GitHub...
git push

echo.
echo ========================================
echo Done! Test files removed from repo.
echo ========================================
echo.
echo Note: Files still exist locally, just not tracked by git
echo ========================================
pause
