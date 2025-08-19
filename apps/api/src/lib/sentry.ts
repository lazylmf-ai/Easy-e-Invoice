import { Sentry } from '@sentry/cloudflare-workers';
import type { ExecutionContext } from '@cloudflare/workers-types';

interface Environment {
  SENTRY_DSN?: string;
  NODE_ENV?: string;
  SENTRY_ENVIRONMENT?: string;
}

// Initialize Sentry
export function initializeSentry(env: Environment) {
  if (!env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'production',
    
    // Sample rate for performance monitoring
    tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,

    // Malaysian e-Invoice specific context
    beforeSend(event, hint) {
      // Add Malaysian business context
      event.tags = {
        ...event.tags,
        country: 'MY',
        compliance: 'lhdn',
        platform: 'cloudflare-workers',
        business_system: 'einvoice',
      };

      // Add business context
      event.contexts = {
        ...event.contexts,
        business: {
          type: 'malaysian_einvoice',
          compliance_system: 'MyInvois',
          tax_authority: 'LHDN',
          target_market: 'micro_sme',
        },
        runtime: {
          name: 'cloudflare-workers',
          version: 'V8',
        },
      };

      // Filter sensitive Malaysian business data
      const sensitiveKeys = [
        'tin', 'sstNumber', 'nric', 'passport', 'bankAccount',
        'password', 'token', 'secret', 'key', 'auth', 'jwt',
        'email', 'phone', 'address'
      ];

      // Recursive function to filter sensitive data
      const filterSensitiveData = (obj: any, depth = 0): any => {
        if (depth > 10) return obj; // Prevent infinite recursion
        
        if (Array.isArray(obj)) {
          return obj.map(item => filterSensitiveData(item, depth + 1));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const filtered = {};
          for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
              filtered[key] = '[Filtered-MY-PII]';
            } else {
              filtered[key] = filterSensitiveData(value, depth + 1);
            }
          }
          return filtered;
        }
        
        return obj;
      };

      // Filter request data
      if (event.request?.data) {
        event.request.data = filterSensitiveData(event.request.data);
      }

      // Filter extra data
      if (event.extra) {
        event.extra = filterSensitiveData(event.extra);
      }

      return event;
    },

    // Add breadcrumbs for Malaysian business operations
    beforeBreadcrumb(breadcrumb) {
      // Add Malaysian business context to breadcrumbs
      if (breadcrumb.category === 'http') {
        breadcrumb.data = {
          ...breadcrumb.data,
          compliance_system: 'lhdn',
        };
      }

      // Filter sensitive breadcrumbs
      if (breadcrumb.message) {
        const message = breadcrumb.message.toLowerCase();
        if (sensitiveKeys.some(key => message.includes(key))) {
          breadcrumb.message = '[Filtered breadcrumb]';
        }
      }

      return breadcrumb;
    },

    // Enhanced error tracking
    integrations: [
      new Sentry.Integrations.RequestData({
        include: {
          ip: false, // Don't include IP for privacy
          user: {
            id: true,
            email: false, // Don't include email for privacy
          },
        },
      }),
    ],
  });
}

// Enhanced error capturing for Malaysian e-Invoice operations
export function captureInvoiceError(error: Error | string, context: {
  invoiceId?: string;
  organizationId?: string;
  operation?: string;
  validationRules?: string[];
  complianceScore?: number;
  tin?: string;
  invoiceType?: string;
}) {
  Sentry.withScope((scope) => {
    // Set Malaysian business context
    scope.setTag('error_category', 'malaysian_einvoice');
    scope.setTag('compliance_system', 'lhdn');
    
    if (context.operation) {
      scope.setTag('business_operation', context.operation);
    }
    
    if (context.invoiceType) {
      scope.setTag('invoice_type', context.invoiceType);
    }

    if (context.complianceScore !== undefined) {
      scope.setTag('compliance_score', context.complianceScore.toString());
      scope.setLevel(context.complianceScore < 70 ? 'error' : 'warning');
    }

    // Set context without sensitive data
    scope.setContext('invoice_operation', {
      invoice_id: context.invoiceId,
      organization_id: context.organizationId,
      operation: context.operation,
      validation_rules: context.validationRules,
      compliance_score: context.complianceScore,
      tin_prefix: context.tin ? context.tin.substring(0, 3) + '***' : undefined,
      invoice_type: context.invoiceType,
    });

    // Capture the error
    if (typeof error === 'string') {
      Sentry.captureMessage(error);
    } else {
      Sentry.captureException(error);
    }
  });
}

// Wrapper for handling requests with Sentry instrumentation
export function withSentry<T extends Request>(
  handler: (request: T, env: Environment, ctx: ExecutionContext) => Promise<Response>
) {
  return async (request: T, env: Environment, ctx: ExecutionContext): Promise<Response> => {
    // Initialize Sentry for this request
    initializeSentry(env);

    return Sentry.withScope(async (scope) => {
      // Set request context
      scope.setTag('method', request.method);
      scope.setTag('url', new URL(request.url).pathname);
      scope.setTag('user_agent', request.headers.get('User-Agent') || 'unknown');
      scope.setTag('country', 'MY');

      try {
        return await handler(request, env, ctx);
      } catch (error) {
        // Capture unhandled errors
        Sentry.captureException(error);
        throw error;
      }
    });
  };
}

// Performance monitoring for Malaysian business operations
export function trackPerformance(operation: string, metadata?: Record<string, any>) {
  const transaction = Sentry.startTransaction({
    name: operation,
    op: 'malaysian_einvoice_operation',
    tags: {
      country: 'MY',
      compliance: 'lhdn',
      ...metadata,
    },
  });

  return {
    finish: () => transaction.finish(),
    setTag: (key: string, value: string) => transaction.setTag(key, value),
    setData: (key: string, value: any) => transaction.setData(key, value),
  };
}