// Circular buffer logger for VidGen5 bot
// Stores last 100 log entries in memory

class Logger {
    constructor(maxEntries = 100) {
        this.maxEntries = maxEntries;
        this.entries = [];
        this.sessionStart = {}; // Track session start timestamp per user
    }

    log(level, message, userId = null, context = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            userId,
            context
        };

        this.entries.push(entry);

        // Remove oldest entry if buffer is full
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }

        // Also log to console for Vercel logs
        const consoleMsg = this.formatEntry(entry);
        if (level === 'ERROR') {
            console.error(consoleMsg);
        } else if (level === 'WARN') {
            console.warn(consoleMsg);
        } else {
            console.log(consoleMsg);
        }
    }

    formatEntry(entry) {
        const time = new Date(entry.timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        let formatted = `[${time}] ${entry.level}`;

        if (entry.userId) {
            formatted += ` [User:${entry.userId}]`;
        }

        formatted += ` ${entry.message}`;

        if (entry.context) {
            formatted += ` | ${JSON.stringify(entry.context)}`;
        }

        return formatted;
    }

    getLogs() {
        if (this.entries.length === 0) {
            return 'No logs available.';
        }

        return this.entries.map(entry => this.formatEntry(entry)).join('\n');
    }

    clear() {
        this.entries = [];
    }

    getCount() {
        return this.entries.length;
    }

    // Mark the start of a user session
    markSessionStart(userId) {
        this.sessionStart[userId] = new Date().toISOString();
        this.log('INFO', 'Session started', userId);
    }

    // Get logs only from the current session for a specific user
    getSessionLogs(userId) {
        if (!this.sessionStart[userId]) {
            // No session marked, return all logs for this user
            return this.getUserLogs(userId);
        }

        const sessionTime = this.sessionStart[userId];
        const sessionEntries = this.entries.filter(entry => {
            return entry.userId === userId && entry.timestamp >= sessionTime;
        });

        if (sessionEntries.length === 0) {
            return 'No logs in current session.';
        }

        return sessionEntries.map(entry => this.formatEntry(entry)).join('\n');
    }

    // Get all logs for a specific user
    getUserLogs(userId) {
        const userEntries = this.entries.filter(entry =>
            entry.userId === userId || entry.userId === parseInt(userId)
        );

        if (userEntries.length === 0) {
            return 'No logs available for this user.';
        }

        return userEntries.map(entry => this.formatEntry(entry)).join('\n');
    }
}

// Create singleton instance
const logger = new Logger();

// Export helper functions
function logInfo(message, userId = null, context = null) {
    logger.log('INFO', message, userId, context);
}

function logWarn(message, userId = null, context = null) {
    logger.log('WARN', message, userId, context);
}

function logError(message, userId = null, context = null) {
    logger.log('ERROR', message, userId, context);
}

module.exports = {
    logger,
    logInfo,
    logWarn,
    logError
};
