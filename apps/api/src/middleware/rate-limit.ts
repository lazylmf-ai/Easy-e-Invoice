import { Context, Next } from 'hono';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface Env {
  RATE_LIMITS?: KVNamespace;
  [key: string]: any;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests' } = options;
  
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `rate_limit:${ip}:${windowStart}`;
    
    try {
      // Use Cloudflare KV for rate limiting if available
      if (c.env?.RATE_LIMITS) {
        const currentStr = await c.env.RATE_LIMITS.get(windowKey);
        const current = currentStr ? parseInt(currentStr, 10) : 0;
        const newCount = current + 1;
        
        if (newCount > maxRequests) {
          return c.json({
            error: 'Rate limit exceeded',
            message,
            retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
          }, 429);
        }
        
        // Store the new count with TTL
        await c.env.RATE_LIMITS.put(
          windowKey, 
          newCount.toString(), 
          { expirationTtl: Math.ceil(windowMs / 1000) + 60 } // Add buffer
        );
        
        // Set rate limit headers
        c.res.headers.set('X-RateLimit-Limit', maxRequests.toString());
        c.res.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - newCount).toString());
        c.res.headers.set('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000).toString());
        
      } else {
        // Fallback: In-memory rate limiting (not suitable for production scaling)
        console.warn('KV namespace not available, using memory-based rate limiting');
        
        // Simple in-memory tracking (limited to single worker instance)
        const memoryKey = `${ip}:${Math.floor(now / windowMs)}`;
        if (!global.rateLimitCache) {
          global.rateLimitCache = new Map();
        }
        
        const currentCount = global.rateLimitCache.get(memoryKey) || 0;
        const newCount = currentCount + 1;
        
        if (newCount > maxRequests) {
          return c.json({
            error: 'Rate limit exceeded',
            message,
            retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
          }, 429);
        }
        
        global.rateLimitCache.set(memoryKey, newCount);
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
          const cutoff = Math.floor((now - windowMs) / windowMs);
          for (const [key] of global.rateLimitCache) {
            const keyTime = parseInt(key.split(':')[1], 10);
            if (keyTime < cutoff) {
              global.rateLimitCache.delete(key);
            }
          }
        }
        
        c.res.headers.set('X-RateLimit-Limit', maxRequests.toString());
        c.res.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - newCount).toString());
        c.res.headers.set('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000).toString());
      }
      
      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, apply conservative rate limiting
      return c.json({
        error: 'Service temporarily unavailable',
        message: 'Rate limiting service error'
      }, 503);
    }
  };
}

// Common rate limiters
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const authRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 auth attempts per minute
  message: 'Too many authentication attempts',
});

export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});