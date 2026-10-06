import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../logging/logger.js';

class InMemoryCache {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  get(key: string): string | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: string, mode?: string, duration?: number): void {
    let expiresAt: number | undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  incr(key: string): number {
    const current = parseInt(this.get(key) || '0', 10);
    const next = current + 1;
    const item = this.store.get(key);
    this.store.set(key, { value: next.toString(), expiresAt: item?.expiresAt });
    return next;
  }

  expire(key: string, seconds: number): void {
    const item = this.store.get(key);
    if (item) {
      this.store.set(key, { value: item.value, expiresAt: Date.now() + seconds * 1000 });
    }
  }

  keys(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key) && this.get(key) !== null) {
        result.push(key);
      }
    }
    return result;
  }
}

class RedisClientService {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryCache = new InMemoryCache();

  constructor() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't retry endlessly if Redis is down
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to Redis');
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          logger.warn(`Redis connection error, falling back to in-memory cache: ${err.message}`);
        }
        this.isConnected = false;
      });

      this.client.connect().catch(() => {
        this.isConnected = false;
        logger.warn('Redis unavailable, operating with in-memory caching fallback');
      });
    } catch {
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fallback
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fallback
      }
    }
    this.memoryCache.set(key, value, ttlSeconds ? 'EX' : undefined, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // fallback
      }
    }
    this.memoryCache.del(key);
  }

  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.incr(key);
      } catch {
        // fallback
      }
    }
    return this.memoryCache.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.expire(key, seconds);
        return;
      } catch {
        // fallback
      }
    }
    this.memoryCache.expire(key, seconds);
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.keys(pattern);
      } catch {
        // fallback
      }
    }
    return this.memoryCache.keys(pattern);
  }
}

export const redis = new RedisClientService();
