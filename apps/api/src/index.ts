import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authRoutes } from './routes/auth';
import { organizationRoutes } from './routes/organizations';
import { invoiceRoutes } from './routes/invoices';
import { importRoutes } from './routes/import';
import { exportRoutes } from './routes/export';
import { templateRoutes } from './routes/templates';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  FRONTEND_URL?: string;
}

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Easy e-Invoice API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API status endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    database: 'connected', // TODO: Add actual database health check
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/auth', authRoutes);
app.route('/org', organizationRoutes);
app.route('/invoices', invoiceRoutes);
app.route('/import', importRoutes);
app.route('/export', exportRoutes);
app.route('/templates', templateRoutes);

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString(),
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