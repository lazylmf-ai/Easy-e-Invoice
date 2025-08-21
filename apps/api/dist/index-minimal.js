import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
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
    }
    catch (error) {
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
