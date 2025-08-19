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

  // Additional configurations for Malaysian e-Invoice context
  beforeSend(event, hint) {
    // Add Malaysian business context
    event.tags = {
      ...event.tags,
      country: 'MY',
      compliance: 'lhdn',
      environment: process.env.NODE_ENV,
    };

    // Add server context
    event.contexts = {
      ...event.contexts,
      business: {
        type: 'malaysian_einvoice',
        compliance_system: 'MyInvois',
        tax_authority: 'LHDN',
      },
    };

    // Filter out sensitive data
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object' && data !== null) {
        // Remove sensitive Malaysian business information
        const sensitiveKeys = [
          'tin', 'sstNumber', 'nric', 'passport', 'bankAccount', 
          'password', 'token', 'secret', 'key', 'auth'
        ];
        
        const filterSensitiveData = (obj: any, depth = 0): any => {
          if (depth > 5) return obj; // Prevent infinite recursion
          
          if (Array.isArray(obj)) {
            return obj.map(item => filterSensitiveData(item, depth + 1));
          }
          
          if (typeof obj === 'object' && obj !== null) {
            const filtered = {};
            for (const [key, value] of Object.entries(obj)) {
              if (sensitiveKeys.some(sensitive => 
                key.toLowerCase().includes(sensitive.toLowerCase())
              )) {
                filtered[key] = '[Filtered]';
              } else {
                filtered[key] = filterSensitiveData(value, depth + 1);
              }
            }
            return filtered;
          }
          
          return obj;
        };

        event.request.data = filterSensitiveData(data);
      }
    }

    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV,

  // Additional server-specific integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  // Enhanced error handling for Malaysian e-Invoice specific errors
  initialScope: {
    tags: {
      component: 'nextjs-server',
      region: 'malaysia',
    },
  },
});