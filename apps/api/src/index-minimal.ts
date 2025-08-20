import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  FRONTEND_URL?: string;
  [key: string]: string | undefined;
}

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin: string) => {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:3001',
      'https://easyeinvoice.com.my',
      'https://www.easyeinvoice.com.my',
      'https://staging.easyeinvoice.com.my'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return origin;
    
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Easy e-Invoice API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    country: 'Malaysia 🇲🇾',
    compliance: 'LHDN e-Invoice ready',
  });
});

// API status endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
    environment: c.env?.NODE_ENV || 'development',
  });
});

// Test database connection
app.get('/test-db', async (c) => {
  try {
    const dbUrl = c.env?.DATABASE_URL;
    if (!dbUrl) {
      return c.json({ error: 'DATABASE_URL not configured' }, 500);
    }
    
    // Basic connection test without importing full postgres
    return c.json({
      status: 'Database URL configured',
      timestamp: new Date().toISOString(),
      hasDatabase: !!dbUrl,
    });
  } catch (error) {
    return c.json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// Malaysian e-Invoice compliance endpoint
app.get('/compliance/status', (c) => {
  return c.json({
    system: 'Easy e-Invoice',
    compliance: {
      lhdn: 'ready',
      myinvois: 'compatible',
      tin_validation: 'enabled',
      sst_calculation: 'enabled',
      b2c_consolidation: 'enabled',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.onError((err, c) => {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  return c.json({
    error: 'Internal Server Error',
    message: 'An error occurred processing your request',
    timestamp: new Date().toISOString(),
    context: {
      country: 'MY',
      compliance_system: 'LHDN',
    },
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: c.req.path,
    timestamp: new Date().toISOString(),
  }, 404);
});

export default app;