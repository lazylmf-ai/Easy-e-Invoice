// Sentry Configuration for Easy e-Invoice
// This file configures error tracking and performance monitoring

const { withSentryConfig } = require('@sentry/nextjs');

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  
  // Upload source maps for better error tracking in production
  hideSourceMaps: true,
  
  // Disable source map uploading in development
  dryRun: process.env.NODE_ENV === 'development',
  
  // Organization and project configuration
  org: process.env.SENTRY_ORG || 'easy-einvoice',
  project: process.env.SENTRY_PROJECT || 'easy-einvoice-web',
  
  // Auth token for uploading
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Include source maps for better debugging
  include: [
    { paths: ['./apps/web/.next'], ignore: ['**/node_modules/**'] },
    { paths: ['./apps/api/dist'], ignore: ['**/node_modules/**'] }
  ],
  
  // Release configuration
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Environment configuration
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error filtering
  beforeSend(event) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = event.exception.values[0];
      
      // Skip cancelled requests
      if (error.type === 'AbortError') {
        return null;
      }
      
      // Skip network timeout errors from client side
      if (error.type === 'TypeError' && error.value?.includes('fetch')) {
        return null;
      }
      
      // Skip browser extension errors
      if (error.value?.includes('extension')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Additional SDK configuration for Next.js
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
  }
};

// Performance monitoring configuration
const performanceConfig = {
  // Transaction sampling
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Custom performance marks
  beforeNavigate: (context) => {
    return {
      ...context,
      tags: {
        ...context.tags,
        'user.country': 'MY', // Malaysian users
        'app.version': process.env.NEXT_PUBLIC_APP_VERSION,
      }
    };
  },
  
  // Transaction name customization
  beforeTransaction: (event) => {
    // Sanitize transaction names for better grouping
    if (event.transaction) {
      event.transaction = event.transaction
        .replace(/\/\d+/g, '/[id]') // Replace IDs with [id]
        .replace(/\/[a-f0-9-]{36}/g, '/[uuid]') // Replace UUIDs
        .replace(/\/\w{8,}/g, '/[hash]'); // Replace long hashes
    }
    return event;
  }
};

// API-specific Sentry configuration
const apiSentryConfig = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE || 'unknown',
  
  // Performance monitoring for API
  tracesSampleRate: process.env.ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Request sampling for high-traffic endpoints
  beforeSend(event) {
    // Sample high-frequency endpoints less aggressively
    if (event.request?.url?.includes('/api/health')) {
      // Only capture 1% of health check errors
      if (Math.random() > 0.01) return null;
    }
    
    return event;
  },
  
  // Custom tags for API requests
  initialScope: {
    tags: {
      component: 'api',
      runtime: 'cloudflare-workers'
    }
  }
};

// Error boundaries configuration
const errorBoundaryConfig = {
  // Fallback component configuration
  fallback: ({ error, resetError }) => ({
    component: 'ErrorFallback',
    props: { error, resetError }
  }),
  
  // Error boundary options
  beforeCapture: (scope, error, errorInfo) => {
    // Add React component stack to error context
    if (errorInfo?.componentStack) {
      scope.setContext('react', {
        componentStack: errorInfo.componentStack
      });
    }
    
    // Add user context if available
    if (typeof window !== 'undefined' && window.localStorage) {
      const userId = window.localStorage.getItem('userId');
      if (userId) {
        scope.setUser({ id: userId });
      }
    }
  }
};

// Monitoring alerts configuration
const alertsConfig = {
  // Error rate thresholds
  errorRateThreshold: {
    warning: 5,   // 5% error rate
    critical: 10  // 10% error rate
  },
  
  // Performance thresholds
  performanceThreshold: {
    p95ResponseTime: 2000,  // 2 seconds
    p99ResponseTime: 5000   // 5 seconds
  },
  
  // Issue assignment rules
  issueOwnership: {
    'api/*': ['backend-team'],
    'apps/web/*': ['frontend-team'],
    'packages/validation/*': ['compliance-team']
  }
};

module.exports = {
  sentryWebpackPluginOptions,
  performanceConfig,
  apiSentryConfig,
  errorBoundaryConfig,
  alertsConfig
};