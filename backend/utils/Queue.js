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

async function getQueueLength(qName) {
    try {
        const redisClient = await ensureConnection();
        const length = await redisClient.lLen(qName);
        return length;
    } catch (error) {
        console.error('Error occurred while getting queue length:', error);
        return -1;
    }
}

async function getTopMessage(qName) {
    try {
        const redisClient = await ensureConnection();
        const message = await redisClient.lRange(qName, -1, -1);
        if (message.length) {
            return JSON.parse(message[0]);
        }
        return null;
    } catch (error) {
        console.error('Error occurred while getting top message:', error);
        return null;
    }
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

async function deleteTopMessageFromQueue(qName) {
    try {
        const redisClient = await ensureConnection();
        const message = await redisClient.lPop(qName);
        if (message) {
            console.log(`Top message deleted from queue '${qName}'`);
            return true;
        } else {
            console.log(`No message found in queue '${qName}'`);
            return true;
        }
    } catch (error) {
        console.error('Error occurred while deleting top message from queue:', error);
        return false;
    }
}

async function fetchObjectsWhereUploadedTimeGreaterThan3Hours(qName) {
    try {
        const redisClient = await ensureConnection();

        // Getting all messages is inefficient - consider using a sorted set instead
        // for time-based queries or implement pagination
        const messages = await redisClient.lRange(qName, 0, -1);

        if (!messages || messages.length === 0) {
            return [];
        }

        const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
        const filteredMessages = [];

        for (const msg of messages) {
            try {
                const messageObj = JSON.parse(msg);
                if (!messageObj.createdAt) continue;

                const uploadTime = new Date(messageObj.createdAt).getTime();
                if (uploadTime > threeHoursAgo) {
                    filteredMessages.push(messageObj);
                }
            } catch (parseError) {
                console.error('Error parsing message:', parseError);
            }
        }

        return filteredMessages;
    } catch (error) {
        console.error('Error occurred while fetching messages older than 3 hours:', error);
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
    connectToRedis,
    getQueueLength,
    getTopMessage,
    uploadMessageToQueue,
    deleteTopMessageFromQueue,
    fetchObjectsWhereUploadedTimeGreaterThan3Hours,
    disconnectRedis,
    getRedisClient,
    ensureConnection
};
