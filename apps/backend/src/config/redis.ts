// ============================================================
// Redis Connection
// ============================================================

import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required for BullMQ
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis: max retries reached');
          return null;
        }
        return Math.min(times * 200, 5000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}

/** Cache helpers with resilient fallback */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await getRedis().get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await getRedis().setex(key, ttlSeconds, serialized);
      } else {
        await getRedis().set(key, serialized);
      }
    } catch {
      // Degrade gracefully
    }
  },

  async del(key: string): Promise<void> {
    try {
      await getRedis().del(key);
    } catch {
      // Degrade gracefully
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await getRedis().keys(pattern);
      if (keys.length > 0) {
        await getRedis().del(...keys);
      }
    } catch {
      // Degrade gracefully
    }
  },
};
