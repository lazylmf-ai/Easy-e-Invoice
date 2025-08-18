// In-memory cache implementation as fallback for Redis
import { createContextLogger } from '../monitoring/logger';
import { cacheOperations } from '../monitoring/metrics';

const logger = createContextLogger('memory-cache');

// Cache entry interface
interface MemoryCacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
}

// Memory cache configuration
export interface MemoryCacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export class MemoryCache {
  private cache = new Map<string, MemoryCacheEntry>();
  private config: MemoryCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MemoryCacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 3600, // 1 hour
      cleanupInterval: 60000, // 1 minute
      evictionPolicy: 'lru',
      ...config
    };

    this.startCleanupTimer();
    logger.info('Memory cache initialized', { config: this.config });
  }

  // Set cache entry
  set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): boolean {
    try {
      const { ttl = this.config.defaultTTL, tags } = options;
      
      // Check if we need to evict entries
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictEntry();
      }

      const now = Date.now();
      const entry: MemoryCacheEntry<T> = {
        value,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now,
        tags
      };

      this.cache.set(key, entry);
      
      cacheOperations.inc({ operation: 'set', result: 'success' });
      logger.debug('Memory cache set', { key, ttl, tags });
      
      return true;

    } catch (error) {
      logger.error('Memory cache set failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'set', result: 'failed' });
      return false;
    }
  }

  // Get cache entry
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        cacheOperations.inc({ operation: 'get', result: 'miss' });
        logger.debug('Memory cache miss', { key });
        return null;
      }

      // Check if entry has expired
      const now = Date.now();
      if (entry.ttl > 0 && (now - entry.timestamp) > (entry.ttl * 1000)) {
        this.cache.delete(key);
        this.stats.misses++;
        cacheOperations.inc({ operation: 'get', result: 'miss' });
        logger.debug('Memory cache expired', { key });
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = now;

      this.stats.hits++;
      cacheOperations.inc({ operation: 'get', result: 'hit' });
      logger.debug('Memory cache hit', { key });
      
      return entry.value;

    } catch (error) {
      logger.error('Memory cache get failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'get', result: 'failed' });
      return null;
    }
  }

  // Delete cache entry
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      
      cacheOperations.inc({ operation: 'delete', result: deleted ? 'success' : 'failed' });
      logger.debug('Memory cache delete', { key, deleted });
      
      return deleted;

    } catch (error) {
      logger.error('Memory cache delete failed', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      cacheOperations.inc({ operation: 'delete', result: 'failed' });
      return false;
    }
  }

  // Clear cache
  clear(pattern?: string): number {
    try {
      let deletedCount = 0;

      if (!pattern) {
        deletedCount = this.cache.size;
        this.cache.clear();
      } else {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => {
          this.cache.delete(key);
          deletedCount++;
        });
      }

      logger.info('Memory cache cleared', { pattern, deletedCount });
      return deletedCount;

    } catch (error) {
      logger.error('Memory cache clear failed', { 
        pattern, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  // Check if key exists
  exists(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (entry.ttl > 0 && (now - entry.timestamp) > (entry.ttl * 1000)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Get multiple keys
  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();

    keys.forEach(key => {
      result.set(key, this.get<T>(key));
    });

    return result;
  }

  // Set multiple keys
  setMultiple<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
      tags?: string[];
    }>
  ): boolean {
    try {
      entries.forEach(({ key, value, ttl, tags }) => {
        this.set(key, value, { ttl, tags });
      });

      logger.debug('Memory cache setMultiple completed', { count: entries.length });
      return true;

    } catch (error) {
      logger.error('Memory cache setMultiple failed', { 
        count: entries.length, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    // Calculate memory usage estimate
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // String characters are 2 bytes each
      memoryUsage += JSON.stringify(entry).length * 2;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys: this.cache.size,
      memoryUsage,
      maxSize: this.config.maxSize
    };
  }

  // Evict entry based on policy
  private evictEntry(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru': // Least Recently Used
        let oldestAccess = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.lastAccessed < oldestAccess) {
            oldestAccess = entry.lastAccessed;
            keyToEvict = key;
          }
        }
        break;

      case 'lfu': // Least Frequently Used
        let lowestCount = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < lowestCount) {
            lowestCount = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;

      case 'ttl': // Shortest TTL
        let shortestTTL = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          const remainingTTL = entry.ttl > 0 ? 
            entry.ttl - ((Date.now() - entry.timestamp) / 1000) : 
            Infinity;
          
          if (remainingTTL < shortestTTL) {
            shortestTTL = remainingTTL;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      logger.debug('Memory cache evicted entry', { 
        key: keyToEvict, 
        policy: this.config.evictionPolicy 
      });
    }
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl > 0 && (now - entry.timestamp) > (entry.ttl * 1000)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug('Memory cache cleanup', { expiredCount: expiredKeys.length });
    }
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Stop cleanup timer
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Health check
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    const stats = this.getStats();
    
    // Consider unhealthy if hit rate is very low or memory usage is too high
    const isHealthy = stats.hitRate > 10 && stats.totalKeys < this.config.maxSize * 0.9;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        hitRate: stats.hitRate,
        utilization: (stats.totalKeys / this.config.maxSize) * 100,
        memoryUsage: stats.memoryUsage
      }
    };
  }

  // Graceful shutdown
  shutdown(): void {
    this.stopCleanupTimer();
    this.cache.clear();
    logger.info('Memory cache shutdown completed');
  }
}

// Default memory cache instance
let defaultMemoryCache: MemoryCache | null = null;

// Initialize default memory cache
export function initializeMemoryCache(config?: Partial<MemoryCacheConfig>): MemoryCache {
  defaultMemoryCache = new MemoryCache(config);
  return defaultMemoryCache;
}

// Get default memory cache instance
export function getMemoryCache(): MemoryCache | null {
  return defaultMemoryCache;
}

// Cache wrapper that uses Redis with memory fallback
export class HybridCache {
  private redis: any; // RedisCache instance
  private memory: MemoryCache;

  constructor(redisCache: any, memoryConfig?: Partial<MemoryCacheConfig>) {
    this.redis = redisCache;
    this.memory = new MemoryCache(memoryConfig);
    
    logger.info('Hybrid cache initialized');
  }

  async set<T>(key: string, value: T, options: any = {}): Promise<boolean> {
    // Try Redis first
    if (this.redis) {
      const redisSuccess = await this.redis.set(key, value, options);
      if (redisSuccess) {
        return true;
      }
    }

    // Fallback to memory cache
    return this.memory.set(key, value, options);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (this.redis) {
      const redisValue = await this.redis.get<T>(key);
      if (redisValue !== null) {
        // Also cache in memory for faster access
        this.memory.set(key, redisValue, { ttl: 300 }); // 5 minute memory cache
        return redisValue;
      }
    }

    // Fallback to memory cache
    return this.memory.get<T>(key);
  }

  async delete(key: string): Promise<boolean> {
    let deleted = false;

    // Delete from both caches
    if (this.redis) {
      deleted = await this.redis.delete(key) || deleted;
    }
    
    deleted = this.memory.delete(key) || deleted;
    
    return deleted;
  }

  async clear(pattern?: string): Promise<number> {
    let cleared = 0;

    if (this.redis) {
      cleared += await this.redis.clear(pattern);
    }
    
    cleared += this.memory.clear(pattern);
    
    return cleared;
  }

  async healthCheck(): Promise<{ redis: any; memory: any; overall: 'healthy' | 'unhealthy' }> {
    const memoryHealth = this.memory.healthCheck();
    
    let redisHealth = { status: 'unhealthy' };
    if (this.redis) {
      redisHealth = await this.redis.healthCheck();
    }

    const overall = (redisHealth.status === 'healthy' || memoryHealth.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      redis: redisHealth,
      memory: memoryHealth,
      overall
    };
  }

  shutdown(): void {
    this.memory.shutdown();
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

export default {
  MemoryCache,
  initializeMemoryCache,
  getMemoryCache,
  HybridCache
};