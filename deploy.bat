@echo off
cd /d "C:\Users\musuk\Documents\AntiGrav\Projects\TGBOT_V"
echo Current directory: %CD%
echo.
echo Deploying to Vercel Production...
echo.
call vercel --prod
echo.
echo ====================================
echo Deployment command finished!
echo ====================================
echo.
echo Window will stay open. Close manually when done.
echo.
cmd /k
