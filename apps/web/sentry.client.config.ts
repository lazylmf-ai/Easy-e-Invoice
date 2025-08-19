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
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Capture replay sessions on errors
  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    new Sentry.Replay({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Additional configurations for Malaysian e-Invoice context
  beforeSend(event, hint) {
    // Add Malaysian business context
    if (event.user) {
      event.tags = {
        ...event.tags,
        country: 'MY',
        compliance: 'lhdn',
      };
    }

    // Filter out sensitive data
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object' && data !== null) {
        // Remove sensitive Malaysian business information
        const sensitiveKeys = ['tin', 'sstNumber', 'nric', 'passport', 'bankAccount'];
        sensitiveKeys.forEach(key => {
          if (key in data) {
            data[key] = '[Filtered]';
          }
        });
      }
    }

    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV,

  // Additional breadcrumb filtering
  beforeBreadcrumb(breadcrumb) {
    // Filter out potentially sensitive breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.message?.includes('password')) {
      return null;
    }
    return breadcrumb;
  },
});