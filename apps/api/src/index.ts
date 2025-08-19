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
import { initializeSentry, withSentry, captureInvoiceError } from './lib/sentry';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  NODE_ENV?: string;
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

// Error handling with Sentry integration
app.onError((err, c) => {
  const env = c.env as Env;
  
  // Initialize Sentry if available
  if (env.SENTRY_DSN) {
    try {
      initializeSentry(env);
      
      // Capture Malaysian e-Invoice specific context
      captureInvoiceError(err, {
        operation: 'api_request',
        invoiceId: c.req.query('invoiceId'),
        organizationId: c.req.query('organizationId'),
      });
    } catch (sentryError) {
      console.warn('Failed to initialize Sentry:', sentryError);
    }
  }

  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  // Enhanced error response for Malaysian e-Invoice context
  const isValidationError = err.message.includes('validation') || err.message.includes('TIN');
  const isComplianceError = err.message.includes('compliance') || err.message.includes('LHDN');
  
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? (isValidationError ? 'Malaysian e-Invoice validation failed' :
         isComplianceError ? 'LHDN compliance check failed' : 
         'An error occurred processing your request')
      : err.message,
    code: isValidationError ? 'VALIDATION_ERROR' : 
          isComplianceError ? 'COMPLIANCE_ERROR' : 'INTERNAL_ERROR',
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

export default {
  fetch: app.fetch,
};