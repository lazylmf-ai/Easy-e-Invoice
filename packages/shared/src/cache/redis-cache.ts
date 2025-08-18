import Redis from 'ioredis';
import { createContextLogger } from '../monitoring/logger';
import { trackError, cacheOperations, cacheSize } from '../monitoring/metrics';

const logger = createContextLogger('redis-cache');

// Cache configuration
export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetries?: number;
  retryDelay?: number;
  keyPrefix?: string;
  defaultTTL?: number;
  maxMemoryPolicy?: string;
}

// Cache entry interface
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

export class RedisCache {
  private redis: Redis | null = null;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(config: CacheConfig) {
    this.config = {
      defaultTTL: 3600, // 1 hour
      keyPrefix: 'einvoice:',
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.initialize();
  }

  private async initialize() {
    try {
      // Create Redis connection
      this.redis = new Redis({
        host: this.config.host || 'localhost',
        port: this.config.port || 6379,
        password: this.config.password,
        db: this.config.db || 0,
        retryDelayOnFailover: this.config.retryDelay,
        maxRetriesPerRequest: this.config.maxRetries,
        keyPrefix: this.config.keyPrefix,
        lazyConnect: true,
        
        // Connection settings
        connectTimeout: 10000,
        commandTimeout: 5000,
        
        // Retry strategy
        retryStrategy: (times) => {
          if (times > this.config.maxRetries!) {
            return null; // Stop retrying
          }
          return Math.min(times * this.config.retryDelay!, 10000);
        },
      });

      // Event handlers
      this.redis.on('connect', () => {
        logger.info('Redis connected');
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready for commands');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
        trackError('cache', 'redis-connection', 'high');
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });

      // Test connection
      await this.redis.ping();
      logger.info('Redis cache initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Redis cache', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      trackError('cache', 'initialization', 'critical');
    }
  }

  // Check if Redis is available
  private isAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  // Generate cache key
  private generateKey(key: string, namespace?: string): string {
    const parts = [namespace, key].filter(Boolean);
    return parts.join(':');
  }

  // Set cache entry
  async set<T>(
    key: string, 
    value: T, 
    options: {
      ttl?: number;
      namespace?: string;
      tags?: string[];
    } = {}
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const { ttl = this.config.defaultTTL, namespace, tags } = options;
      const cacheKey = this.generateKey(key, namespace);
      
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl!,
        tags
      };

      const serialized = JSON.stringify(entry);
      
      if (ttl && ttl > 0) {
        await this.redis!.setex(cacheKey, ttl, serialized);
      } else {
        await this.redis!.set(cacheKey, serialized);
      }

      // Track metrics
      cacheOperations.inc({ operation: 'set', result: 'success' });
      
      // Update cache size metric
      this.updateCacheSizeMetric();

      logger.debug('Cache set', { key: cacheKey, ttl, tags });
      return true;

    } catch (error) {
      logger.error('Cache set failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'set', result: 'failed' });
      return false;
    }
  }

  // Get cache entry
  async get<T>(
    key: string, 
    options: {
      namespace?: string;
    } = {}
  ): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const { namespace } = options;
      const cacheKey = this.generateKey(key, namespace);
      
      const serialized = await this.redis!.get(cacheKey);
      
      if (!serialized) {
        this.stats.misses++;
        cacheOperations.inc({ operation: 'get', result: 'miss' });
        logger.debug('Cache miss', { key: cacheKey });
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(serialized);
      
      // Check if entry has expired (additional safety check)
      if (entry.ttl > 0 && (Date.now() - entry.timestamp) > (entry.ttl * 1000)) {
        await this.delete(key, { namespace });
        this.stats.misses++;
        cacheOperations.inc({ operation: 'get', result: 'miss' });
        return null;
      }

      this.stats.hits++;
      cacheOperations.inc({ operation: 'get', result: 'hit' });
      logger.debug('Cache hit', { key: cacheKey });
      
      return entry.value;

    } catch (error) {
      logger.error('Cache get failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'get', result: 'failed' });
      return null;
    }
  }

  // Delete cache entry
  async delete(
    key: string, 
    options: {
      namespace?: string;
    } = {}
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const { namespace } = options;
      const cacheKey = this.generateKey(key, namespace);
      
      const result = await this.redis!.del(cacheKey);
      
      cacheOperations.inc({ operation: 'delete', result: result > 0 ? 'success' : 'failed' });
      
      // Update cache size metric
      this.updateCacheSizeMetric();

      logger.debug('Cache delete', { key: cacheKey, deleted: result > 0 });
      return result > 0;

    } catch (error) {
      logger.error('Cache delete failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'delete', result: 'failed' });
      return false;
    }
  }

  // Clear cache by pattern
  async clear(pattern?: string, namespace?: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const searchPattern = namespace 
        ? this.generateKey(pattern || '*', namespace)
        : pattern || '*';

      const keys = await this.redis!.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis!.del(...keys);
      
      // Update cache size metric
      this.updateCacheSizeMetric();

      logger.info('Cache cleared', { pattern: searchPattern, deletedKeys: result });
      return result;

    } catch (error) {
      logger.error('Cache clear failed', { 
        pattern, 
        namespace, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, namespace);
      const result = await this.redis!.exists(cacheKey);
      return result > 0;

    } catch (error) {
      logger.error('Cache exists check failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // Get multiple keys at once
  async getMultiple<T>(
    keys: string[], 
    namespace?: string
  ): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (!this.isAvailable() || keys.length === 0) {
      keys.forEach(key => result.set(key, null));
      return result;
    }

    try {
      const cacheKeys = keys.map(key => this.generateKey(key, namespace));
      const values = await this.redis!.mget(...cacheKeys);

      values.forEach((value, index) => {
        const originalKey = keys[index];
        
        if (value) {
          try {
            const entry: CacheEntry<T> = JSON.parse(value);
            
            // Check expiration
            if (entry.ttl > 0 && (Date.now() - entry.timestamp) > (entry.ttl * 1000)) {
              result.set(originalKey, null);
              this.delete(originalKey, { namespace }); // Clean up expired entry
            } else {
              result.set(originalKey, entry.value);
              this.stats.hits++;
            }
          } catch (parseError) {
            result.set(originalKey, null);
          }
        } else {
          result.set(originalKey, null);
          this.stats.misses++;
        }
      });

      return result;

    } catch (error) {
      logger.error('Cache getMultiple failed', { 
        keys: keys.length, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return all nulls on error
      keys.forEach(key => result.set(key, null));
      return result;
    }
  }

  // Set multiple keys at once
  async setMultiple<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
      tags?: string[];
    }>,
    namespace?: string
  ): Promise<boolean> {
    if (!this.isAvailable() || entries.length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis!.pipeline();

      entries.forEach(({ key, value, ttl = this.config.defaultTTL, tags }) => {
        const cacheKey = this.generateKey(key, namespace);
        const entry: CacheEntry<T> = {
          value,
          timestamp: Date.now(),
          ttl: ttl!,
          tags
        };

        const serialized = JSON.stringify(entry);

        if (ttl && ttl > 0) {
          pipeline.setex(cacheKey, ttl, serialized);
        } else {
          pipeline.set(cacheKey, serialized);
        }
      });

      await pipeline.exec();

      // Update cache size metric
      this.updateCacheSizeMetric();

      logger.debug('Cache setMultiple completed', { count: entries.length });
      return true;

    } catch (error) {
      logger.error('Cache setMultiple failed', { 
        count: entries.length, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    let totalKeys = 0;
    let memoryUsage = 0;

    if (this.isAvailable()) {
      try {
        const info = await this.redis!.info('memory');
        const keyspace = await this.redis!.info('keyspace');
        
        // Parse memory usage
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          memoryUsage = parseInt(memoryMatch[1]);
        }

        // Parse total keys
        const keysMatch = keyspace.match(/keys=(\d+)/);
        if (keysMatch) {
          totalKeys = parseInt(keysMatch[1]);
        }
      } catch (error) {
        logger.warn('Failed to get Redis stats', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys,
      memoryUsage
    };
  }

  // Update cache size metric
  private async updateCacheSizeMetric() {
    try {
      if (this.isAvailable()) {
        const info = await this.redis!.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          const memoryUsage = parseInt(memoryMatch[1]);
          cacheSize.set({ cache_type: 'redis' }, memoryUsage);
        }
      }
    } catch (error) {
      // Silently fail to avoid affecting main operations
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    if (!this.isAvailable()) {
      return { status: 'unhealthy' };
    }

    try {
      const start = Date.now();
      await this.redis!.ping();
      const latency = Date.now() - start;

      return { 
        status: latency < 100 ? 'healthy' : 'unhealthy', 
        latency 
      };

    } catch (error) {
      logger.error('Redis health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { status: 'unhealthy' };
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.error('Error during Redis disconnect', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }
}

// Default cache instance
let defaultCache: RedisCache | null = null;

// Initialize default cache
export function initializeCache(config: CacheConfig): RedisCache {
  defaultCache = new RedisCache(config);
  return defaultCache;
}

// Get default cache instance
export function getCache(): RedisCache | null {
  return defaultCache;
}

// Malaysian-specific cache helpers
export const malaysianCache = {
  // TIN validation cache
  async getTinValidation(tin: string) {
    const cache = getCache();
    if (!cache) return null;
    
    return cache.get(`tin:${tin}`, { namespace: 'validation' });
  },

  async setTinValidation(tin: string, result: any, ttl = 86400) { // 24 hours
    const cache = getCache();
    if (!cache) return false;
    
    return cache.set(`tin:${tin}`, result, { 
      namespace: 'validation', 
      ttl,
      tags: ['tin', 'validation']
    });
  },

  // Industry code cache
  async getIndustryCode(code: string) {
    const cache = getCache();
    if (!cache) return null;
    
    return cache.get(`industry:${code}`, { namespace: 'msic' });
  },

  async setIndustryCode(code: string, data: any, ttl = 604800) { // 7 days
    const cache = getCache();
    if (!cache) return false;
    
    return cache.set(`industry:${code}`, data, { 
      namespace: 'msic', 
      ttl,
      tags: ['industry', 'msic']
    });
  },

  // Exchange rate cache
  async getExchangeRate(from: string, to: string, date?: string) {
    const cache = getCache();
    if (!cache) return null;
    
    const key = date ? `${from}:${to}:${date}` : `${from}:${to}`;
    return cache.get(`rate:${key}`, { namespace: 'exchange' });
  },

  async setExchangeRate(from: string, to: string, rate: number, date?: string, ttl = 3600) { // 1 hour
    const cache = getCache();
    if (!cache) return false;
    
    const key = date ? `${from}:${to}:${date}` : `${from}:${to}`;
    return cache.set(`rate:${key}`, { rate, timestamp: Date.now() }, { 
      namespace: 'exchange', 
      ttl,
      tags: ['exchange', 'rate']
    });
  },

  // Invoice validation cache
  async getInvoiceValidation(invoiceId: string) {
    const cache = getCache();
    if (!cache) return null;
    
    return cache.get(`invoice:${invoiceId}`, { namespace: 'validation' });
  },

  async setInvoiceValidation(invoiceId: string, result: any, ttl = 7200) { // 2 hours
    const cache = getCache();
    if (!cache) return false;
    
    return cache.set(`invoice:${invoiceId}`, result, { 
      namespace: 'validation', 
      ttl,
      tags: ['invoice', 'validation']
    });
  },

  // Clear all Malaysian caches
  async clearAll() {
    const cache = getCache();
    if (!cache) return 0;
    
    let cleared = 0;
    cleared += await cache.clear('*', 'validation');
    cleared += await cache.clear('*', 'msic');
    cleared += await cache.clear('*', 'exchange');
    
    return cleared;
  }
};

export default {
  RedisCache,
  initializeCache,
  getCache,
  malaysianCache
};