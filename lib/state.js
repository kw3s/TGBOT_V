// Simple in-memory state for Vercel (Best Effort)
// NOTE: This is ephemeral. It will be lost if the serverless function restarts.
// But it works well for quick interactions (User sends Image -> Immediately sends Audio).

const userState = {};

function setUserImage(chatId, fileId) {
    userState[chatId] = {
        imageFileId: fileId,
        timestamp: Date.now()
    };
}

function getUserImage(chatId) {
    const state = userState[chatId];
    if (!state) return null;

    // Optional: Expire after 10 minutes
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        delete userState[chatId];
        return null;
    }

    return state.imageFileId;
}

function clearUserImage(chatId) {
    delete userState[chatId];
}

module.exports = { setUserImage, getUserImage, clearUserImage };
