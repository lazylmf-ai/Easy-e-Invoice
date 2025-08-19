// Mock Sentry implementation for deployment
import type { ExecutionContext } from '@cloudflare/workers-types';

interface Environment {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
}

// Mock Sentry implementation
const Sentry = {
  init: () => {},
  captureException: (error: any) => console.error('Error:', error),
  captureMessage: (message: string) => console.log('Message:', message),
  withScope: (callback: (scope: any) => void) => {
    const mockScope = {
      setTag: () => {},
      setLevel: () => {},
      setContext: () => {},
      setUser: () => {},
      setExtra: () => {}
    };
    callback(mockScope);
  }
};

export function initSentry(env: Environment) {
  console.log('Sentry initialization (mock mode)');
}

export function captureError(error: Error | string, context?: any) {
  console.error('API Error:', error, context ? { context } : '');
}

export function captureInvoiceError(error: Error | string, context: {
  invoiceId?: string;
  organizationId?: string;
  operation?: string;
  validationRules?: string[];
  complianceScore?: number;
  tin?: string;
  invoiceType?: string;
}) {
  console.error('Invoice Error:', error, { 
    operation: context.operation,
    invoiceId: context.invoiceId?.substring(0, 8) + '...',
    complianceScore: context.complianceScore
  });
}

export function captureValidationError(error: Error | string, context: {
  validationRule?: string;
  fieldPath?: string;
  invoiceId?: string;
  organizationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  console.error('Validation Error:', error, {
    rule: context.validationRule,
    field: context.fieldPath,
    severity: context.severity
  });
}

export function captureFileProcessingError(error: Error | string, context: {
  fileType?: string;
  fileSize?: number;
  organizationId?: string;
  operation?: string;
  recordsProcessed?: number;
  totalRecords?: number;
}) {
  console.error('File Processing Error:', error, {
    fileType: context.fileType,
    operation: context.operation,
    progress: `${context.recordsProcessed}/${context.totalRecords}`
  });
}

export function captureUserJourneyEvent(event: string, context: {
  userId?: string;
  organizationId?: string;
  step?: string;
  success?: boolean;
  metadata?: Record<string, any>;
}) {
  console.log('User Journey:', event, {
    step: context.step,
    success: context.success,
    metadata: context.metadata
  });
}

export { Sentry };