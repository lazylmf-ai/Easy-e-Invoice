import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { validateBody } from '../middleware/validation';
import { authRateLimit } from '../middleware/rate-limit';
import { authMiddleware } from '../middleware/auth';
import { AuthService } from '../services/auth-service';
import { createDatabaseFromEnv } from '@einvoice/database';
import { users } from '@einvoice/database/schema';
import { Env } from '../index';

const app = new Hono();

// Validation schemas
const magicLinkSchema = z.object({
  email: z.string().email('Valid email address required'),
});

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Send magic link
app.post('/magic-link', 
  authRateLimit,
  validateBody(magicLinkSchema),
  async (c) => {
    try {
      const { email } = (c as any).get('validatedBody');
      const env = c.env as Env;
      
      // Initialize auth service
      const authService = new AuthService({
        JWT_SECRET: env.JWT_SECRET,
        RESEND_API_KEY: env.RESEND_API_KEY,
        FRONTEND_URL: env.FRONTEND_URL,
      });
      
      // Send magic link email
      const result = await authService.sendMagicLink(email);
      
      if (!result.success) {
        return c.json({
          error: 'Failed to send magic link',
          message: result.message,
        }, 400);
      }
      
      return c.json({
        message: result.message,
        email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Magic link error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to send magic link',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

// Verify magic link token
app.post('/verify',
  authRateLimit,
  validateBody(verifyTokenSchema),
  async (c) => {
    try {
      const { token } = (c as any).get('validatedBody');
      const env = c.env as Env;
      
      // Initialize auth service and database
      const authService = new AuthService({
        JWT_SECRET: env.JWT_SECRET,
        RESEND_API_KEY: env.RESEND_API_KEY,
        FRONTEND_URL: env.FRONTEND_URL,
      });
      
      const db = createDatabaseFromEnv(env);
      
      // Verify magic link token
      const payload = await authService.verifyToken(token);
      
      if (payload.type !== 'magic-link') {
        return c.json({
          error: 'Invalid token type',
          message: 'This token is not a valid magic link token',
        }, 400);
      }
      
      if (authService.isTokenExpired(payload)) {
        return c.json({
          error: 'Token expired',
          message: 'This magic link has expired. Please request a new one.',
        }, 400);
      }
      
      // Find or create user
      let user = await db
        .select()
        .from(users)
        .where(eq(users.email, payload.email))
        .limit(1);
      
      if (user.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            email: payload.email,
            isEmailVerified: true,
            lastLoginAt: new Date(),
          })
          .returning();
        
        user = newUser;
      } else {
        // Update last login
        await db
          .update(users)
          .set({
            lastLoginAt: new Date(),
            isEmailVerified: true,
          })
          .where(eq(users.id, user[0].id));
      }
      
      // Generate auth token
      const authToken = await authService.generateAuthToken(user[0].id, user[0].email);
      
      return c.json({
        message: 'Login successful',
        token: authToken,
        user: {
          id: user[0].id,
          email: user[0].email,
          orgId: user[0].orgId,
          isEmailVerified: user[0].isEmailVerified,
          hasCompletedOnboarding: !!user[0].orgId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error instanceof Error && error.message.includes('Invalid or expired token')) {
        return c.json({
          error: 'Invalid token',
          message: 'This magic link is invalid or has expired',
        }, 400);
      }
      
      return c.json({
        error: 'Internal Server Error',
        message: 'Token verification failed',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

// Get current user info
app.get('/me', authMiddleware, async (c) => {
  try {
    const user = (c as any).get('user');
    
    if (!user) {
      return c.json({
        error: 'Unauthorized',
        message: 'Please log in to access this endpoint',
      }, 401);
    }
    
    const env = c.env as Env;
    const db = createDatabaseFromEnv(env);
    
    // Get full user details from database
    const userDetails = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    
    if (userDetails.length === 0) {
      return c.json({
        error: 'User not found',
        message: 'User account no longer exists',
      }, 404);
    }
    
    const userData = userDetails[0];
    
    return c.json({
      user: {
        id: userData.id,
        email: userData.email,
        orgId: userData.orgId,
        isEmailVerified: userData.isEmailVerified,
        hasCompletedOnboarding: !!userData.orgId,
        createdAt: userData.createdAt,
        lastLoginAt: userData.lastLoginAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to get user information',
    }, 500);
  }
});

// Logout
app.post('/logout', async (c) => {
  // For JWT-based auth, logout is handled client-side
  // But we can add token blacklisting here if needed
  
  return c.json({
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  });
});

export { app as authRoutes };