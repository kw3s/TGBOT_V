@echo off
cd /d "C:\Users\musuk\Documents\AntiGrav\Projects\TGBOT_V"
echo Current directory: %CD%
echo.
echo Fetching Vercel runtime logs...
echo.
echo Press Ctrl+C when you have enough logs
echo.
vercel logs https://tgbotv-mu.vercel.app
echo.
echo ====================================
echo Logs fetch finished!
echo ====================================
echo.
echo Window will stay open. Close manually when done.
echo.
cmd /k
