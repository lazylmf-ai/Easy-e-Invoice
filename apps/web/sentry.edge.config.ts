// Try to import Sentry, fall back to mock if not available
let Sentry: any;
try {
  Sentry = require('@sentry/nextjs');
} catch (error) {
  console.warn('Sentry not available, using mock implementation');
  Sentry = require('./src/lib/sentry-mock').Sentry;
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1.0,

  // Malaysian e-Invoice edge runtime configuration
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      country: 'MY',
      compliance: 'lhdn',
    };

    // Filter sensitive data for edge runtime
    const sensitiveKeys = ['tin', 'sstNumber', 'nric', 'password', 'token'];
    if (event.request?.data) {
      sensitiveKeys.forEach(key => {
        if (event.request?.data?.[key]) {
          event.request.data[key] = '[Filtered]';
        }
      });
    }

    return event;
  },

  environment: process.env.NODE_ENV,
});