import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryCache = new Map<string, { value: string; expiresAt: number }>();

  constructor(@Optional() private configService?: ConfigService) {}

  async onModuleInit() {
    const redisUrl =
      this.configService?.get<string>('REDIS_URL') ||
      process.env.REDIS_URL ||
      'redis://localhost:6381';

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts; fall back to memory
          }
          return Math.min(times * 200, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis connected successfully at ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis connection issue: ${err.message}. Using resilient memory fallback.`,
        );
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (err: unknown) {
      this.isConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis initialization skipped (${msg}). Operating in local fallback mode.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error: unknown) {
        this.logger.debug(
          `Redis quit failed, forcing disconnect: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.client.disconnect();
      }
    }
    this.memoryCache.clear();
  }

  async isHealthy(): Promise<boolean> {
    if (this.client && this.isConnected) {
      try {
        const ping = await this.client.ping();
        return ping === 'PONG';
      } catch (error: unknown) {
        this.logger.warn(
          `Redis health ping failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
      }
    }
    return true; // Memory fallback considered healthy
  }

  async ping(): Promise<string> {
    if (this.client) {
      return await this.client.ping();
    }
    return 'PONG';
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client && this.isConnected) {
      try {
        const raw = await this.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis get failed for key "${key}": ${msg}. Falling back to memory.`);
      }
    }

    // Memory cache fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.client && this.isConnected) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis set failed for key "${key}": ${msg}. Falling back to memory.`);
      }
    }

    // Memory cache fallback
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.memoryCache.set(key, { value: serialized, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.del(key);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis del failed for key "${key}": ${msg}`);
      }
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await new Promise<void>((resolve) => {
          if (!this.client) return resolve();
          const stream = this.client.scanStream({
            match: pattern,
            count: 50,
          });

          stream.on('data', async (keys: Array<string>) => {
            if (keys.length > 0 && this.client) {
              stream.pause();
              try {
                await this.client.del(...keys);
              } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to delete keys batch in pattern ${pattern}: ${msg}`);
              } finally {
                stream.resume();
              }
            }
          });

          stream.on('end', () => resolve());
          stream.on('error', (err) => {
            this.logger.warn(`Redis scan stream error for pattern ${pattern}: ${err.message}`);
            resolve();
          });
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis delPattern failed for pattern "${pattern}": ${msg}`);
      }
    }

    // Clear matching memory keys
    const regexPattern = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async incr(key: string, ttlSeconds = 60): Promise<number> {
    if (this.client && this.isConnected) {
      try {
        const count = await this.client.incr(key);
        if (count === 1 && ttlSeconds > 0) {
          await this.client.expire(key, ttlSeconds);
        }
        return count;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis incr failed for key "${key}": ${msg}`);
      }
    }

    // Memory counter fallback
    const current = this.memoryCache.get(key);
    let count = 1;
    if (current && (!current.expiresAt || Date.now() <= current.expiresAt)) {
      count = Number(JSON.parse(current.value)) + 1;
    }
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value: JSON.stringify(count), expiresAt });
    return count;
  }
}
