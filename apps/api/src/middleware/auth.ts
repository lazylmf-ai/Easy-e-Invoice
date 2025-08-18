import { Context, Next } from 'hono';
import { AuthService } from '../services/auth-service';
import { Env } from '../index';

export interface JWTPayload {
  userId: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(c: Context, next: Next) {
  const authorization = c.req.header('Authorization');
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  const token = authorization.slice(7);
  
  try {
    const env = c.env as Env;
    const authService = new AuthService({
      JWT_SECRET: env.JWT_SECRET,
      RESEND_API_KEY: env.RESEND_API_KEY,
      FRONTEND_URL: env.FRONTEND_URL,
    });
    
    const payload = await authService.verifyToken(token);
    
    // Only allow auth tokens for protected endpoints
    if (payload.type !== 'auth') {
      return c.json({
        error: 'Invalid Token',
        message: 'This token type is not valid for authentication',
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // Check if token is expired
    if (authService.isTokenExpired(payload)) {
      return c.json({
        error: 'Token Expired',
        message: 'Your session has expired. Please log in again.',
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // Validate required JWT fields
    if (!payload.userId || !payload.email) {
      return c.json({
        error: 'Invalid Token',
        message: 'Token missing required fields',
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    c.set('user', payload as any);
    await next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return c.json({
      error: 'Invalid Token',
      message: 'Token verification failed',
      timestamp: new Date().toISOString(),
    }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authorization = c.req.header('Authorization');
  
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    
    try {
      const env = c.env as Env;
      const authService = new AuthService({
        JWT_SECRET: env.JWT_SECRET,
        RESEND_API_KEY: env.RESEND_API_KEY,
        FRONTEND_URL: env.FRONTEND_URL,
      });
      
      const payload = await authService.verifyToken(token);
      
      if (payload.type === 'auth' && payload.userId && payload.email && !authService.isTokenExpired(payload)) {
        c.set('user', payload as any);
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error);
    }
  }
  
  await next();
}