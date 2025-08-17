import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { Env } from '../index';

export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
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
    const secret = new TextEncoder().encode((c.env as any).JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Validate required JWT fields
    if (!payload.userId || !payload.orgId || !payload.email) {
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
      const secret = new TextEncoder().encode((c.env as any).JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.userId && payload.orgId && payload.email) {
        c.set('user', payload as any);
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error);
    }
  }
  
  await next();
}