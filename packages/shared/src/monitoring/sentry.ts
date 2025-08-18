import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { createContextLogger } from './logger';
import { alertManager } from './alerting';

const logger = createContextLogger('sentry');

// Sentry configuration for Easy e-Invoice
export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enableProfiling: boolean;
  enablePerformanceMonitoring: boolean;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeSendTransaction?: (event: Sentry.Transaction) => Sentry.Transaction | null;
}

// Initialize Sentry with Malaysian e-Invoice specific configuration
export function initializeSentry(config: SentryConfig) {
  if (!config.dsn) {
    logger.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  const integrations = [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    Sentry.extraErrorDataIntegration(),
    Sentry.rewriteFramesIntegration(),
    Sentry.requestDataIntegration({
      include: {
        cookies: false, // Don't capture cookies for privacy
        data: true,
        headers: ['user-agent', 'x-forwarded-for', 'x-request-id'],
        ip: true,
        query_string: true,
        url: true,
        user: {
          id: true,
          email: false, // Don't capture email for privacy
          username: false
        }
      }
    })
  ];

  // Add profiling integration if enabled
  if (config.enableProfiling) {
    integrations.push(nodeProfilingIntegration());
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    
    // Sampling configuration
    sampleRate: config.sampleRate,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    
    integrations,
    
    // Custom data scrubbing for Malaysian compliance
    beforeSend: (event) => {
      // Remove sensitive Malaysian data
      if (event.request?.data) {
        event.request.data = scrubSensitiveData(event.request.data);
      }
      
      if (event.extra) {
        event.extra = scrubSensitiveData(event.extra);
      }

      if (event.contexts?.state) {
        event.contexts.state = scrubSensitiveData(event.contexts.state);
      }

      // Apply custom beforeSend if provided
      return config.beforeSend ? config.beforeSend(event) : event;
    },

    beforeSendTransaction: config.beforeSendTransaction,

    // Enhanced error categorization
    initialScope: {
      tags: {
        service: 'easy-einvoice',
        region: 'malaysia',
        compliance: 'malaysian-einvoice'
      },
      contexts: {
        app: {
          name: 'Easy e-Invoice',
          version: process.env.APP_VERSION || '1.0.0'
        },
        runtime: {
          name: 'node',
          version: process.version
        }
      }
    }
  });

  logger.info('Sentry initialized', { 
    environment: config.environment,
    profilingEnabled: config.enableProfiling,
    performanceEnabled: config.enablePerformanceMonitoring
  });
}

// Scrub sensitive Malaysian e-Invoice data
function scrubSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    // Malaysian sensitive data
    'tin', 'taxId', 'taxIdentificationNumber',
    'ic', 'identityCard', 'nric',
    'passport', 'passportNumber',
    'bankAccount', 'accountNumber',
    'sstNumber', 'sstId',
    
    // General sensitive data
    'password', 'secret', 'token', 'key',
    'email', 'phone', 'mobile',
    'address', 'street', 'postcode',
    'creditCard', 'debitCard', 'card',
    
    // API keys and credentials
    'apiKey', 'clientSecret', 'accessToken',
    'refreshToken', 'sessionId'
  ];

  const scrubbed = { ...data };

  for (const [key, value] of Object.entries(scrubbed)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field should be scrubbed
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively scrub nested objects
      scrubbed[key] = scrubSensitiveData(value);
    }
  }

  return scrubbed;
}

// Enhanced error capture with context
export function captureError(error: Error, context?: {
  user?: { id: string; organizationId?: string };
  request?: { id: string; method?: string; url?: string };
  invoice?: { id: string; number?: string };
  organization?: { id: string; tin?: string };
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  level?: Sentry.SeverityLevel;
}) {
  Sentry.withScope((scope) => {
    // Set user context (scrubbed)
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        organizationId: context.user.organizationId
      });
    }

    // Set request context
    if (context?.request) {
      scope.setTag('requestId', context.request.id);
      if (context.request.method) {
        scope.setTag('httpMethod', context.request.method);
      }
      if (context.request.url) {
        scope.setContext('request', {
          url: context.request.url,
          method: context.request.method
        });
      }
    }

    // Set Malaysian e-Invoice specific context
    if (context?.invoice) {
      scope.setContext('invoice', {
        id: context.invoice.id,
        number: context.invoice.number
      });
      scope.setTag('invoiceId', context.invoice.id);
    }

    if (context?.organization) {
      scope.setContext('organization', {
        id: context.organization.id,
        tinHash: context.organization.tin ? hashString(context.organization.tin) : undefined
      });
      scope.setTag('organizationId', context.organization.id);
    }

    // Set additional tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Set extra context (scrubbed)
    if (context?.extra) {
      scope.setContext('extra', scrubSensitiveData(context.extra));
    }

    // Set severity level
    if (context?.level) {
      scope.setLevel(context.level);
    }

    // Add Malaysian compliance tags
    scope.setTag('compliance', 'malaysian-einvoice');
    scope.setTag('region', 'malaysia');

    const eventId = Sentry.captureException(error);
    
    logger.error('Error captured by Sentry', { 
      eventId, 
      errorMessage: error.message,
      userId: context?.user?.id,
      invoiceId: context?.invoice?.id
    });

    // Trigger alert for critical errors
    if (context?.level === 'fatal' || error.name === 'ValidationError') {
      alertManager.triggerAlert('sentry_error', {
        service: 'error-tracking',
        severity: 'critical',
        error: error.message,
        sentryEventId: eventId,
        context: context || {},
        timestamp: new Date().toISOString()
      });
    }

    return eventId;
  });
}

// Capture Malaysian validation errors
export function captureValidationError(
  error: Error, 
  invoice: { id: string; number: string },
  validationRule: string,
  organizationId: string
) {
  return captureError(error, {
    tags: {
      errorType: 'validation',
      validationRule,
      component: 'malaysian-rules'
    },
    invoice,
    user: { id: 'system', organizationId },
    extra: {
      validationRule,
      invoiceData: '[REDACTED]' // Don't send actual invoice data
    },
    level: 'error'
  });
}

// Capture file processing errors
export function captureFileProcessingError(
  error: Error,
  operation: 'import' | 'export',
  fileType: string,
  userId: string,
  organizationId: string
) {
  return captureError(error, {
    tags: {
      errorType: 'file-processing',
      operation,
      fileType
    },
    user: { id: userId, organizationId },
    extra: {
      operation,
      fileType,
      processingTime: Date.now()
    },
    level: 'error'
  });
}

// Capture authentication errors
export function captureAuthError(
  error: Error,
  authType: 'login' | 'magic-link' | 'token-validation',
  ipAddress?: string,
  userAgent?: string
) {
  return captureError(error, {
    tags: {
      errorType: 'authentication',
      authType
    },
    extra: {
      authType,
      ipAddress: ipAddress ? hashString(ipAddress) : undefined,
      userAgent
    },
    level: 'warning'
  });
}

// Capture performance issues
export function capturePerformanceIssue(
  operation: string,
  duration: number,
  threshold: number,
  context?: any
) {
  const message = `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`;
  
  Sentry.withScope((scope) => {
    scope.setTag('performanceIssue', true);
    scope.setTag('operation', operation);
    scope.setLevel('warning');
    
    scope.setContext('performance', {
      operation,
      duration,
      threshold,
      overThresholdBy: duration - threshold
    });

    if (context) {
      scope.setContext('operationContext', scrubSensitiveData(context));
    }

    Sentry.captureMessage(message);
  });
}

// Transaction monitoring for key operations
export function withSentryTransaction<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op: operation }, async () => {
    try {
      return await fn();
    } catch (error) {
      Sentry.getCurrentScope()?.setTag('transactionFailed', true);
      throw error;
    }
  });
}

// Malaysian specific transaction monitoring
export function withValidationTransaction<T>(
  invoiceId: string,
  ruleCode: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSentryTransaction(
    `validation.${ruleCode}`,
    'validation',
    fn
  );
}

export function withFileProcessingTransaction<T>(
  operation: 'import' | 'export',
  fileType: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSentryTransaction(
    `file.${operation}.${fileType}`,
    'file-processing',
    fn
  );
}

// Express middleware for automatic error capture
export function sentryErrorHandler() {
  return Sentry.expressErrorHandler({
    shouldHandleError(error) {
      // Only capture errors that should be tracked
      if (error.status && error.status < 500) {
        return false; // Don't capture client errors
      }
      
      return true;
    }
  });
}

// Express middleware for request tracing
export function sentryRequestHandler() {
  return Sentry.expressIntegration();
}

// Health check integration
export async function sentryHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  lastEvent?: string;
  client?: string;
}> {
  try {
    const client = Sentry.getClient();
    if (!client) {
      return { status: 'unhealthy' };
    }

    // Test Sentry connection with a breadcrumb
    Sentry.addBreadcrumb({
      message: 'Health check test',
      level: 'info',
      timestamp: Date.now() / 1000
    });

    return {
      status: 'healthy',
      client: 'active'
    };
  } catch (error) {
    logger.error('Sentry health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return { 
      status: 'unhealthy',
      lastEvent: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to hash sensitive data
function hashString(input: string): string {
  // Simple hash for masking - in production, use proper crypto
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

// Configuration helper
export function getSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    enableProfiling: process.env.SENTRY_ENABLE_PROFILING === 'true',
    enablePerformanceMonitoring: process.env.SENTRY_ENABLE_PERFORMANCE === 'true'
  };
}

export default {
  initializeSentry,
  captureError,
  captureValidationError,
  captureFileProcessingError,
  captureAuthError,
  capturePerformanceIssue,
  withSentryTransaction,
  withValidationTransaction,
  withFileProcessingTransaction,
  sentryErrorHandler,
  sentryRequestHandler,
  sentryHealthCheck,
  getSentryConfig
};