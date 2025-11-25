const FRAMES = [
    "Merging files... 🌑",
    "Merging files... 🌒",
    "Merging files... 🌓",
    "Merging files... 🌔",
    "Merging files... 🌕",
    "Merging files... 🌖",
    "Merging files... 🌗",
    "Merging files... 🌘"
];

async function startAnimation(bot, chatId, messageId, baseText = "Merging files...") {
    let frameIndex = 0;
    let isRunning = true;

    const interval = setInterval(async () => {
        if (!isRunning) {
            clearInterval(interval);
            return;
        }

        const frame = FRAMES[frameIndex];
        const text = `${baseText} ${frame.split('... ')[1]}`; // Extract emoji

        try {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId
            });
        } catch (e) {
            // Ignore errors (e.g. message not modified)
        }

        frameIndex = (frameIndex + 1) % FRAMES.length;
    }, 2000); // Update every 2 seconds

    return () => {
        isRunning = false;
        clearInterval(interval);
    };
}

module.exports = { startAnimation };
