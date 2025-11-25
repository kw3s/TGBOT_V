@echo off
echo ========================================
echo EMERGENCY: Clear Telegram Webhook
echo ========================================
echo.

echo This will delete all pending updates from Telegram
echo.
pause

curl "https://api.telegram.org/bot%BOT_TOKEN%/deleteWebhook?drop_pending_updates=true"

echo.
echo.
echo Done! Webhook cleared.
echo Now set it again in Vercel.
echo ========================================
pause
