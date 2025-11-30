@echo off
echo ========================================
echo   VERCEL COMPLETE CACHE CLEAR
echo ========================================
echo.
echo This will:
echo 1. Remove local .vercel folder
echo 2. Add cache-busting to vercel.json
echo 3. Deploy with --force flag
echo.
pause

cd /d "C:\Users\musuk\Documents\AntiGrav\Projects\TGBOT_V"

echo.
echo [Step 1/3] Removing local .vercel cache...
if exist ".vercel" (
    rmdir /s /q .vercel
    echo   ✓ Removed .vercel folder
) else (
    echo   - No .vercel folder found
)

echo.
echo [Step 2/3] Adding cache-busting to vercel.json...
echo { > vercel.json
echo   "builds": [ >> vercel.json
echo     { >> vercel.json
echo       "src": "**", >> vercel.json
echo       "use": "@vercel/node" >> vercel.json
echo     } >> vercel.json
echo   ], >> vercel.json
echo   "build": { >> vercel.json
echo     "env": { >> vercel.json
echo       "CACHE_BUST": "%DATE%-%TIME%" >> vercel.json
echo     } >> vercel.json
echo   } >> vercel.json
echo } >> vercel.json
echo   ✓ Updated vercel.json with cache-busting

echo.
echo [Step 3/3] Deploying with --force flag...
echo.
vercel --prod --force

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Next: Test the bot with a Spotify link
echo.
pause
