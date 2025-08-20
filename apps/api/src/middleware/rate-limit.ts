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
    const ipHeader =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Real-IP') ??
      c.req.header('X-Forwarded-For')?.split(',')[0].trim();
    const ip = ipHeader ?? 'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `rate_limit:${ip}:${windowStart}`;
    
    try {
      // Use Cloudflare KV for rate limiting if available
      if (c.env?.RATE_LIMITS) {
        const currentCount = await c.env.RATE_LIMITS.get(windowKey);
        const newCount = (parseInt(currentCount || '0', 10)) + 1;
        
        if (newCount > maxRequests) {
          const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);
          const reset = Math.ceil((windowStart + windowMs) / 1000);
          return c.json(
            {
              error: 'Rate limit exceeded',
              message,
              retryAfter,
            },
            429,
            {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
            }
          );
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
        const globalCache = (globalThis as any).rateLimitCache;
        if (!globalCache) {
          (globalThis as any).rateLimitCache = new Map();
        }
        
        const currentCount = (globalThis as any).rateLimitCache.get(memoryKey) || 0;
        const newCount = currentCount + 1;
        
        if (newCount > maxRequests) {
          return c.json({
            error: 'Rate limit exceeded',
            message,
            retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
          }, 429);
        }
        
        (globalThis as any).rateLimitCache.set(memoryKey, newCount);
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
          const cutoff = Math.floor((now - windowMs) / windowMs);
          for (const [key] of (globalThis as any).rateLimitCache) {
            const keyTime = parseInt(key.split(':')[1], 10);
            if (keyTime < cutoff) {
              (globalThis as any).rateLimitCache.delete(key);
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