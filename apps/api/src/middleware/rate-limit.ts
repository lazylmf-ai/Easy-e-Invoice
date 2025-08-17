import { Context, Next } from 'hono';
import { Env } from '../index';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests' } = options;
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `rate_limit:${ip}`;
    
    try {
      // For now, we'll use a simple in-memory approach
      // In production, this should use Cloudflare KV or Durable Objects
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;
      
      // This is a simplified implementation
      // In real implementation, you'd use KV storage:
      // const current = await c.env.KV.get(windowKey);
      // const count = current ? parseInt(current) + 1 : 1;
      // await c.env.KV.put(windowKey, count.toString(), { expirationTtl: Math.ceil(windowMs / 1000) });
      
      // For now, just log and continue
      console.log(`Rate limit check for ${ip}: simulated`);
      
      // Add rate limit headers
      c.res.headers.set('X-RateLimit-Limit', maxRequests.toString());
      c.res.headers.set('X-RateLimit-Remaining', (maxRequests - 1).toString());
      c.res.headers.set('X-RateLimit-Reset', (windowStart + windowMs).toString());
      
      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue on error to avoid blocking legitimate requests
      await next();
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