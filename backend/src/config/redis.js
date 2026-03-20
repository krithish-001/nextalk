const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis client with graceful fallback
 * If Redis is unavailable, the app continues without caching
 */
const connectRedis = () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis error (non-fatal): ${err.message}`);
      redisClient = null; // Fall back to in-memory
    });

    return redisClient;
  } catch (error) {
    logger.warn(`Redis unavailable, using in-memory fallback: ${error.message}`);
    return null;
  }
};

/**
 * In-memory fallback for online users when Redis is unavailable
 */
const inMemoryStore = new Map();

const cache = {
  get: async (key) => {
    if (redisClient) {
      return await redisClient.get(key);
    }
    return inMemoryStore.get(key) || null;
  },

  set: async (key, value, ttl = null) => {
    if (redisClient) {
      if (ttl) {
        return await redisClient.setex(key, ttl, value);
      }
      return await redisClient.set(key, value);
    }
    inMemoryStore.set(key, value);
    return 'OK';
  },

  del: async (key) => {
    if (redisClient) {
      return await redisClient.del(key);
    }
    inMemoryStore.delete(key);
    return 1;
  },

  sadd: async (key, ...members) => {
    if (redisClient) {
      return await redisClient.sadd(key, ...members);
    }
    const set = inMemoryStore.get(key) || new Set();
    members.forEach((m) => set.add(m));
    inMemoryStore.set(key, set);
    return members.length;
  },

  srem: async (key, ...members) => {
    if (redisClient) {
      return await redisClient.srem(key, ...members);
    }
    const set = inMemoryStore.get(key) || new Set();
    members.forEach((m) => set.delete(m));
    inMemoryStore.set(key, set);
    return members.length;
  },

  smembers: async (key) => {
    if (redisClient) {
      return await redisClient.smembers(key);
    }
    const set = inMemoryStore.get(key) || new Set();
    return Array.from(set);
  },
};

module.exports = { connectRedis, cache };
