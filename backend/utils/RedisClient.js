const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.AIVEN_REDIS_URL, // Ensure this environment variable is set with the correct Aiven Redis URL
  password: process.env.AIVEN_REDIS_PASSWORD, // Ensure this environment variable is set with the correct Aiven Redis password
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Retry limit reached');
      }
      return Math.min(retries * 50, 500);
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis connection closed');
});

redisClient.connect().catch(console.error);

module.exports = redisClient;
