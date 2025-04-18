const redis = require('redis');
require('dotenv').config();

let redisClientInstance;

function getRedisClient() {
    if (!redisClientInstance) {
        redisClientInstance = redis.createClient({
            url: process.env.AIVEN_REDIS_URL,
            password: process.env.AIVEN_REDIS_PASSWORD,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        return new Error('Maximum retry attempts reached, giving up');
                    }
                    const maxRetryTime = 1000 * 60 * 60;
                    const delay = Math.min(retries * 100, maxRetryTime);
                    console.log(`Attempting to reconnect... Retry #${retries}, delay: ${delay}ms`);
                    return delay;
                },
                connectTimeout: 10000, // 10 seconds
                keepAlive: 5000, // 5 seconds
            }
        });

        redisClientInstance.on('error', (err) => {
            console.error('Redis Client Error:', err);
            if (err.code === 'ECONNREFUSED') {
                console.error('Connection refused. Please check if Redis server is running');
            } else if (err.code === 'ECONNRESET') {
                console.error('Connection reset by peer. Network issues detected');
            } else if (err.message.includes('WRONGPASS')) {
                console.error('Authentication failed. Please check Redis credentials');
            }
        });

        redisClientInstance.on('connect', async () => {
            console.log('Redis client connected');
        });

        redisClientInstance.on('ready', () => {
            console.log('Redis client ready and able to process commands');
        });

        redisClientInstance.on('reconnecting', () => {
            console.log('Redis client attempting to reconnect...');
        });
    }
    return redisClientInstance;
}

async function connectToRedis() {
    try {
        if (!process.env.AIVEN_REDIS_URL || !process.env.AIVEN_REDIS_PASSWORD) {
            throw new Error('Redis configuration missing. Please check environment variables.');
        }

        const redisClient = getRedisClient();
        await redisClient.connect();

        // Test the connection
        await redisClient.ping();
        console.log('Successfully connected to Redis and connection verified');
        return true;
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
}

async function ensureConnection() {
    const redisClient = getRedisClient();
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
}

async function uploadMessageToQueue(qName, message) {
    try {
        const redisClient = await ensureConnection();
        const messageString = JSON.stringify(message);
        await redisClient.lPush(qName, messageString);
        console.log(`Message added to queue '${qName}'`);
        return true;
    } catch (error) {
        console.error('Error occurred while uploading message to queue:', error);
        return false;
    }
}

/**
 * Fetches objects from the queue that are older than the specified time
 * and removes them from the queue.
 *
 * @param {string} qName - The name of the Redis queue
 * @param {number} time - Time in milliseconds (defaults to 3 hours)
 * @param {boolean} removeFromQueue - Whether to remove processed messages (defaults to true)
 * @returns {Promise<Array>} - Array of filtered message objects
 */
async function fetchObjectsWhereUploadedTimeGreaterThan3Hours(qName, time = 3 * 60 * 60 * 1000, removeFromQueue = true) {
    try {
        const redisClient = await ensureConnection();

        // Get all messages from the queue
        const messages = await redisClient.lRange(qName, 0, -1);

        if (!messages || messages.length === 0) {
            console.log(`No messages found in queue '${qName}'`);
            return [];
        }

        const cutoffTime = Date.now() - time;
        const filteredMessages = [];
        const messagesToRemove = [];

        // First pass: filter messages based on age
        for (const msg of messages) {
            try {
                const messageObj = JSON.parse(msg);

                const uploadTime = new Date(messageObj.createdAt).getTime();
                if (uploadTime < cutoffTime) {
                    filteredMessages.push(messageObj);
                    messagesToRemove.push(msg);
                }
            } catch (parseError) {
                console.error('Error parsing message:', parseError, 'Message:', msg.substring(0, 100) + '...');
            }
        }

        console.log(`Found ${filteredMessages.length} messages older than the specified time threshold`);

        // Remove messages if requested
        if (removeFromQueue && messagesToRemove.length > 0) {
            // Use multi to batch removal operations
            const multi = redisClient.multi();

            for (const msg of messagesToRemove) {
                // Remove each message from the queue (only remove 1 occurrence)
                multi.lRem(qName, 1, msg);
            }

            // Execute all removal commands in one batch
            const results = await multi.exec();

            console.log(`Removed ${messagesToRemove.length} messages from queue '${qName}'`);

            // Check for any failed operations
            let failedOperations = 0;
            for (let i = 0; i < results.length; i++) {
                if (results[i] === null || results[i] <= 0) {
                    failedOperations++;
                }
            }

            if (failedOperations > 0) {
                console.warn(`${failedOperations} message removal operations failed`);
            }
        }

        return filteredMessages;
    } catch (error) {
        console.error('Error occurred while fetching/removing old messages:', error);
        return [];
    }
}
async function disconnectRedis() {
    try {
        const redisClient = getRedisClient();
        await redisClient.quit();
        console.log('Redis connection closed.');
        return true;
    } catch (error) {
        console.error('Error occurred while closing Redis connection:', error);
        return false;
    }
}

module.exports = {
    uploadMessageToQueue,
    disconnectRedis,
    getRedisClient,
    fetchObjectsWhereUploadedTimeGreaterThan3Hours
};
