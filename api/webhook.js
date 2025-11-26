const TelegramBot = require('node-telegram-bot-api');
const { handleManualMode } = require('../lib/manualMode');
const { handleAudioMode } = require('../lib/audioMode');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Duplicate message prevention (keep last 100 message IDs)
const processedMessages = new Set();
const MAX_PROCESSED = 100;

module.exports = async (req, res) => {
    try {
        const body = req.body;
        console.log("VIDGEN5_DEBUG_V1: Webhook triggered");
        console.log("Received update:", JSON.stringify(body, null, 2));

        if (body.message) {
            const msg = body.message;
            const chatId = msg.chat.id;
            const text = msg.text;

            // Prevent duplicate processing
            const messageId = `${chatId}_${msg.message_id}`;
            if (processedMessages.has(messageId)) {
                console.log(`Duplicate message detected: ${messageId}. Ignoring.`);
                res.status(200).send('OK');
                return;
            }
            processedMessages.add(messageId);
            if (processedMessages.size > MAX_PROCESSED) {
                // Remove the oldest item if the set exceeds max size
                const firstItem = processedMessages.values().next().value;
                processedMessages.delete(firstItem);
            }

            // Command: /start or /modes
            if (text === '/start' || text === '/modes') {
                // Mark session start for this user
                const { logger } = require('../lib/logger');
                logger.markSessionStart(msg.from.id);

                await bot.sendMessage(chatId, "Welcome to VidGen5! 🎵🎥\nSelect a mode:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📸 Manual Mode (Image + Audio)", callback_data: "mode_manual" }],
                            [{ text: "🎵 Audio Only Mode ⭐ (Best!)", callback_data: "mode_audio" }],
                            [{ text: "🔗 Link Mode (50/50)", callback_data: "mode_link" }]
                        ]
                    }
                });
            }
            // Command: /help
            else if (text === '/help') {
                await bot.sendMessage(chatId, "🆘 VidGen5 Help\n\n" +
                    "Modes:\n" +
                    "📸 Manual: Send an Image, then reply with Audio.\n" +
                    "🎵 Audio Only: Send Audio, I'll find the cover art. (⭐ Most Reliable!)\n" +
                    "🔗 Link: Send a DSP link or song name. (⚠️ 50/50 - may not find audio)\n\n" +
                    "Commands:\n" +
                    "/modes - Show Mode Menu\n" +
                    "/cancel - Cancel current operation\n" +
                    "/help - Show this message");
            }
            // Command: /cancel
            else if (text === '/cancel') {
                const { clearUserImage } = require('../lib/state');
                const fs = require('fs');
                const path = require('path');
                const os = require('os');

                // 1. Clear In-Memory State
                clearUserImage(chatId);

                // 2. Clear Lock Files (Manual & Search)
                const tmpDir = os.tmpdir();
                const manualLock = path.join(tmpDir, `lock_${chatId}.lock`);
                const searchLock = path.join(tmpDir, `lock_search_${chatId}.lock`);

                if (fs.existsSync(manualLock)) fs.unlinkSync(manualLock);
                if (fs.existsSync(searchLock)) fs.unlinkSync(searchLock);

                await bot.sendMessage(chatId, "🚫 Operation cancelled. Locks released & state cleared.");
            }
            // Command: /logs (Admin Only)
            else if (text === '/logs') {
                const adminUserId = process.env.ADMIN_USER_ID;
                const userId = msg.from.id.toString();

                if (!adminUserId || userId !== adminUserId) {
                    await bot.sendMessage(chatId, "⛔ Access denied. Admin only.");
                } else {
                    await bot.sendMessage(chatId, 
                        "📋 VidGen5 Logs\n\n" +
                        "ℹ️ On serverless platforms (Vercel), in-memory logs don't persist between function calls.\n\n" +
                        "✅ All bot activity IS logged to console and captured by Vercel.\n\n" +
                        "📍 To view complete logs:\n" +
                        "1. Go to Vercel Dashboard\n" +
                        "2. Select your project\n" +
                        "3. Click 'Logs' tab\n" +
                        "4. Filter by your user ID or time range\n\n" +
                        "💡 All errors, warnings, and info messages are there!"
                    );
                }
            }
            // Handle Replies (Stateless Context)
            else if (msg.reply_to_message && msg.reply_to_message.from.is_bot) {
                const replyText = msg.reply_to_message.text;
                console.log("DEBUG: Reply Text:", replyText);

                // Check if it's a Manual Mode step
                if (replyText.includes("Manual Mode") || replyText.includes("Got image")) {
                    await handleManualMode(bot, msg);
                }
                // Check if it's Audio Mode
                else if (replyText.includes("Audio Only Mode") || replyText.includes("Artist/Title")) {
                    await handleAudioMode(bot, msg);
                }
            }
            // Handle Direct Files
            else if (msg.photo) {
                await handleManualMode(bot, msg);
            }
            else if (msg.audio) {
                // ... (Audio Mode logic existing) ...
                // 1. Check if it's a reply to Manual Mode (Explicit) -> Handled above in reply_to_message block? 
                // No, msg.audio is separate if it's NOT a reply. 
                // Wait, if it IS a reply, it goes to the reply block. 
                // So this block is ONLY for non-replies (e.g. Forwarding).

                // 2. Check State (Implicit Manual Mode)
                const { getUserImage } = require('../lib/state');
                const cachedImageId = getUserImage(chatId);

                if (cachedImageId) {
                    await handleManualMode(bot, msg);
                } else {
                    await handleAudioMode(bot, msg);
                }
            }
            // Handle Text (Search Mode or Link Mode)
            else if (text && !text.startsWith('/')) {
                // If it's a URL or just text, treat as Search Mode
                // But wait, we have "Link Mode" button. 
                // Actually, "Link Mode" and "Search Mode" are the same logic.
                // The button just prompts them.
                const { handleSearchMode } = require('../lib/searchMode');
                await handleSearchMode(bot, msg);
            }
            else {
                // Default Echo (or help message)
                await bot.sendMessage(chatId, "Please select a mode using /start");
            }
        }

        // Handle Callback Queries (Button Clicks)
        if (body.callback_query) {
            const query = body.callback_query;
            const chatId = query.message.chat.id;
            const data = query.data;

            if (data === 'mode_manual') {
                await bot.sendMessage(chatId, "📸 Manual Mode\n\nPlease send me an Image first.");
            } else if (data === 'mode_audio') {
                await bot.sendMessage(chatId, "🎵 Audio Only Mode\n\nPlease send me an Audio file.");
            } else if (data === 'mode_link') {
                await bot.sendMessage(chatId, "🔗 Link/Search Mode\n\nSend me a YouTube Link OR just type a Song Name.\n(e.g. 'Drake God's Plan' - hyphen is optional!)");
            }

            // Answer the query to stop the loading animation
            await bot.answerCallbackQuery(query.id);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Error');
    }
};
