// Try to import Sentry, fall back to mock if not available
let Sentry: any;
try {
  Sentry = require('@sentry/nextjs');
} catch (error) {
  console.warn('Sentry not available, using mock implementation');
  Sentry = require('./sentry-mock').Sentry;
}

// Malaysian e-Invoice specific performance monitoring
export class MalaysianBusinessMonitor {
  static trackInvoiceOperation(operation: 'create' | 'validate' | 'export' | 'import', metadata?: {
    invoiceType?: string;
    currency?: string;
    complianceScore?: number;
    processingTime?: number;
    organizationTin?: string;
    lineItemCount?: number;
  }) {
    const transaction = Sentry.startTransaction({
      name: `malaysian_einvoice_${operation}`,
      op: 'malaysian_business_operation',
      tags: {
        country: 'MY',
        compliance_system: 'LHDN',
        operation_type: operation,
        invoice_type: metadata?.invoiceType,
        currency: metadata?.currency,
      },
    });

    if (metadata?.complianceScore !== undefined) {
      transaction.setTag('compliance_score', metadata.complianceScore.toString());
      transaction.setData('compliance_details', {
        score: metadata.complianceScore,
        level: metadata.complianceScore >= 90 ? 'excellent' : 
               metadata.complianceScore >= 70 ? 'good' : 'needs_improvement',
      });
    }

    if (metadata?.organizationTin) {
      // Store only TIN prefix for privacy
      transaction.setTag('tin_prefix', metadata.organizationTin.substring(0, 3));
    }

    if (metadata?.lineItemCount) {
      transaction.setTag('line_items', metadata.lineItemCount.toString());
    }

    return {
      finish: () => transaction.finish(),
      setTag: (key: string, value: string) => transaction.setTag(key, value),
      setData: (key: string, value: any) => transaction.setData(key, value),
      addBreadcrumb: (message: string, category?: string) => {
        Sentry.addBreadcrumb({
          message,
          category: category || 'malaysian_business',
          level: 'info',
          timestamp: Date.now(),
        });
      },
    };
  }

  static trackValidationRules(rules: string[], scores: Record<string, number>) {
    Sentry.addBreadcrumb({
      message: 'Malaysian validation rules executed',
      category: 'compliance_check',
      level: 'info',
      data: {
        rules_count: rules.length,
        rules: rules,
        scores: scores,
        overall_score: Object.values(scores).reduce((a, b) => a + b, 0) / rules.length,
      },
      timestamp: Date.now(),
    });
  }

  static trackSSTCalculation(details: {
    currency: string;
    subtotal: number;
    sstRate: number;
    sstAmount: number;
    exemptions?: string[];
  }) {
    Sentry.addBreadcrumb({
      message: 'SST calculation performed',
      category: 'tax_calculation',
      level: 'info',
      data: {
        currency: details.currency,
        sst_rate: details.sstRate,
        has_exemptions: (details.exemptions?.length || 0) > 0,
        exemption_count: details.exemptions?.length || 0,
      },
      timestamp: Date.now(),
    });
  }

  static trackB2CConsolidation(details: {
    industryCode: string;
    isAllowed: boolean;
    reason?: string;
    periodType: string;
  }) {
    Sentry.addBreadcrumb({
      message: 'B2C consolidation check',
      category: 'compliance_rule',
      level: details.isAllowed ? 'info' : 'warning',
      data: {
        industry_code: details.industryCode,
        consolidation_allowed: details.isAllowed,
        period_type: details.periodType,
        rejection_reason: details.reason,
      },
      timestamp: Date.now(),
    });
  }

  static trackFileProcessing(operation: 'csv_import' | 'pdf_export' | 'json_export', metadata: {
    fileSize?: number;
    recordCount?: number;
    processingTime?: number;
    errorCount?: number;
    warningCount?: number;
  }) {
    const transaction = Sentry.startTransaction({
      name: `file_processing_${operation}`,
      op: 'malaysian_file_operation',
      tags: {
        country: 'MY',
        operation: operation,
        record_count: metadata.recordCount?.toString(),
        has_errors: (metadata.errorCount || 0) > 0 ? 'true' : 'false',
        has_warnings: (metadata.warningCount || 0) > 0 ? 'true' : 'false',
      },
    });

    if (metadata.fileSize) {
      transaction.setData('file_size_mb', (metadata.fileSize / (1024 * 1024)).toFixed(2));
    }

    if (metadata.processingTime) {
      transaction.setData('processing_time_ms', metadata.processingTime);
    }

    transaction.setData('quality_metrics', {
      total_records: metadata.recordCount || 0,
      error_count: metadata.errorCount || 0,
      warning_count: metadata.warningCount || 0,
      success_rate: metadata.recordCount 
        ? ((metadata.recordCount - (metadata.errorCount || 0)) / metadata.recordCount * 100).toFixed(2) + '%'
        : '0%',
    });

    return {
      finish: () => transaction.finish(),
      setError: (error: Error) => {
        transaction.setTag('status', 'error');
        Sentry.captureException(error);
      },
      setSuccess: () => {
        transaction.setTag('status', 'success');
      },
    };
  }

  static trackUserJourney(step: string, metadata?: {
    organizationSetup?: boolean;
    invoiceCount?: number;
    templatesUsed?: number;
    complianceLevel?: string;
  }) {
    Sentry.addBreadcrumb({
      message: `User journey: ${step}`,
      category: 'user_flow',
      level: 'info',
      data: {
        step,
        organization_setup_complete: metadata?.organizationSetup || false,
        invoice_count: metadata?.invoiceCount || 0,
        templates_used: metadata?.templatesUsed || 0,
        compliance_level: metadata?.complianceLevel || 'unknown',
        country: 'MY',
        business_size: 'micro_sme',
      },
      timestamp: Date.now(),
    });
  }

  static setUserContext(user: {
    id: string;
    organizationId?: string;
    organizationName?: string;
    tinPrefix?: string;
    hasCompletedOnboarding?: boolean;
    subscriptionTier?: string;
  }) {
    Sentry.setUser({
      id: user.id,
      // Don't include email for privacy
      username: user.organizationName,
    });

    Sentry.setTag('organization_id', user.organizationId || 'unknown');
    Sentry.setTag('onboarding_complete', user.hasCompletedOnboarding ? 'true' : 'false');
    Sentry.setTag('subscription_tier', user.subscriptionTier || 'free');
    Sentry.setTag('country', 'MY');
    Sentry.setTag('business_size', 'micro_sme');
    
    if (user.tinPrefix) {
      Sentry.setTag('tin_prefix', user.tinPrefix);
    }

    Sentry.setContext('malaysian_business', {
      organization_id: user.organizationId,
      organization_name: user.organizationName,
      tin_prefix: user.tinPrefix,
      onboarding_complete: user.hasCompletedOnboarding,
      compliance_system: 'LHDN',
      target_market: 'micro_sme',
      features_used: [],
    });
  }

  static reportComplianceIssue(issue: {
    type: 'validation_error' | 'compliance_warning' | 'format_error';
    rule: string;
    message: string;
    fieldPath?: string;
    invoiceId?: string;
    severity: 'low' | 'medium' | 'high';
    suggestions?: string[];
  }) {
    const level = issue.severity === 'high' ? 'error' : 
                  issue.severity === 'medium' ? 'warning' : 'info';

    Sentry.withScope((scope) => {
      scope.setTag('compliance_issue', true);
      scope.setTag('issue_type', issue.type);
      scope.setTag('rule_code', issue.rule);
      scope.setTag('severity', issue.severity);
      scope.setTag('country', 'MY');
      scope.setTag('compliance_system', 'LHDN');
      
      if (issue.fieldPath) {
        scope.setTag('field_path', issue.fieldPath);
      }

      if (issue.invoiceId) {
        scope.setTag('invoice_id', issue.invoiceId);
      }

      scope.setContext('compliance_details', {
        rule: issue.rule,
        field_path: issue.fieldPath,
        suggestions: issue.suggestions,
        malaysian_context: true,
      });

      scope.setLevel(level);

      Sentry.captureMessage(`Malaysian compliance issue: ${issue.message}`);
    });
  }

  static trackAPIPerformance(endpoint: string, method: string, statusCode: number, duration: number) {
    const transaction = Sentry.startTransaction({
      name: `API ${method} ${endpoint}`,
      op: 'http.request',
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        country: 'MY',
        api_type: 'malaysian_einvoice',
      },
    });

    transaction.setData('duration_ms', duration);
    transaction.setData('success', statusCode >= 200 && statusCode < 400);

    if (statusCode >= 400) {
      transaction.setTag('error_category', statusCode >= 500 ? 'server_error' : 'client_error');
    }

    transaction.finish();
  }
}

// Error reporting utilities
export function reportError(error: Error, context?: {
  feature?: string;
  operation?: string;
  userId?: string;
  organizationId?: string;
  additionalData?: Record<string, any>;
}) {
  Sentry.withScope((scope) => {
    scope.setTag('country', 'MY');
    scope.setTag('business_system', 'malaysian_einvoice');
    
    if (context?.feature) {
      scope.setTag('feature', context.feature);
    }
    
    if (context?.operation) {
      scope.setTag('operation', context.operation);
    }
    
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context?.organizationId) {
      scope.setTag('organization_id', context.organizationId);
    }
    
    if (context?.additionalData) {
      scope.setContext('additional_data', context.additionalData);
    }
    
    Sentry.captureException(error);
  });
}

// Performance measurement hook
export function usePerformanceTracking() {
  return {
    trackInvoiceOperation: MalaysianBusinessMonitor.trackInvoiceOperation,
    trackFileProcessing: MalaysianBusinessMonitor.trackFileProcessing,
    trackUserJourney: MalaysianBusinessMonitor.trackUserJourney,
    reportComplianceIssue: MalaysianBusinessMonitor.reportComplianceIssue,
    reportError,
  };
}

// MalaysianBusinessMonitor already exported above