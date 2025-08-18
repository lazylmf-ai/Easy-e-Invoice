import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createContextLogger } from './logger';

const logger = createContextLogger('metrics');

// Create a Registry to register metrics
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics for Easy e-Invoice application

// API Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type']
});

// Authentication Metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'] // type: login, magic_link; status: success, failed
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

export const sessionDuration = new Histogram({
  name: 'session_duration_seconds',
  help: 'Duration of user sessions in seconds',
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400]
});

// Invoice Processing Metrics
export const invoiceOperations = new Counter({
  name: 'invoice_operations_total',
  help: 'Total number of invoice operations',
  labelNames: ['operation', 'status'] // operation: create, update, delete, validate; status: success, failed
});

export const invoiceValidationDuration = new Histogram({
  name: 'invoice_validation_duration_seconds',
  help: 'Duration of invoice validation in seconds',
  labelNames: ['rule_count'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

export const invoiceValidationResults = new Counter({
  name: 'invoice_validation_results_total',
  help: 'Total number of invoice validation results',
  labelNames: ['rule_code', 'severity', 'status'] // status: passed, failed
});

export const invoiceStatusGauge = new Gauge({
  name: 'invoices_by_status',
  help: 'Number of invoices by status',
  labelNames: ['status'] // draft, pending, approved, rejected
});

// Malaysian Compliance Metrics
export const malaysianRuleValidations = new Counter({
  name: 'malaysian_rule_validations_total',
  help: 'Total number of Malaysian rule validations',
  labelNames: ['rule_code', 'result'] // result: pass, fail, warning
});

export const tinValidations = new Counter({
  name: 'tin_validations_total',
  help: 'Total number of TIN validations',
  labelNames: ['entity_type', 'valid'] // entity_type: corporate, individual, government, nonprofit
});

export const sstCalculations = new Counter({
  name: 'sst_calculations_total',
  help: 'Total number of SST calculations',
  labelNames: ['currency', 'rate']
});

// File Processing Metrics
export const fileUploads = new Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['file_type', 'status'] // file_type: csv, pdf, json; status: success, failed
});

export const fileProcessingDuration = new Histogram({
  name: 'file_processing_duration_seconds',
  help: 'Duration of file processing in seconds',
  labelNames: ['operation', 'file_type'], // operation: import, export
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
});

export const csvRecordsProcessed = new Counter({
  name: 'csv_records_processed_total',
  help: 'Total number of CSV records processed',
  labelNames: ['operation', 'status'] // operation: import, export; status: success, failed
});

// Database Metrics
export const databaseQueries = new Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['table', 'operation'] // operation: select, insert, update, delete
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

export const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

// Organization Metrics
export const organizationOperations = new Counter({
  name: 'organization_operations_total',
  help: 'Total number of organization operations',
  labelNames: ['operation', 'status'] // operation: create, update, verify_tin
});

export const organizationsByType = new Gauge({
  name: 'organizations_by_type',
  help: 'Number of organizations by type',
  labelNames: ['business_type'] // sdn_bhd, sole_proprietor, partnership, etc.
});

// Cache Metrics
export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'] // operation: get, set, delete; result: hit, miss, success, failed
});

export const cacheSize = new Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_type'] // validation, tin, industry_codes
});

// Error Metrics
export const applicationErrors = new Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['service', 'error_type', 'severity']
});

export const validationErrors = new Counter({
  name: 'validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['field', 'error_type']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(authAttempts);
register.registerMetric(activeUsers);
register.registerMetric(sessionDuration);
register.registerMetric(invoiceOperations);
register.registerMetric(invoiceValidationDuration);
register.registerMetric(invoiceValidationResults);
register.registerMetric(invoiceStatusGauge);
register.registerMetric(malaysianRuleValidations);
register.registerMetric(tinValidations);
register.registerMetric(sstCalculations);
register.registerMetric(fileUploads);
register.registerMetric(fileProcessingDuration);
register.registerMetric(csvRecordsProcessed);
register.registerMetric(databaseQueries);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseConnections);
register.registerMetric(organizationOperations);
register.registerMetric(organizationsByType);
register.registerMetric(cacheOperations);
register.registerMetric(cacheSize);
register.registerMetric(applicationErrors);
register.registerMetric(validationErrors);

// Middleware for collecting HTTP metrics
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Track request
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    // Override res.end to collect duration
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = (Date.now() - start) / 1000;
      
      httpRequestDuration.observe(
        {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        },
        duration
      );

      // Track errors
      if (res.statusCode >= 400) {
        httpRequestErrors.inc({
          method: req.method,
          route: req.route?.path || req.path,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
        });
      }

      originalEnd.apply(this, args);
    };

    next();
  };
}

// Helper functions for tracking specific events

export function trackInvoiceOperation(operation: string, status: 'success' | 'failed') {
  invoiceOperations.inc({ operation, status });
}

export function trackValidationResult(ruleCode: string, severity: string, status: 'passed' | 'failed') {
  invoiceValidationResults.inc({ rule_code: ruleCode, severity, status });
}

export function trackMalaysianRule(ruleCode: string, result: 'pass' | 'fail' | 'warning') {
  malaysianRuleValidations.inc({ rule_code: ruleCode, result });
}

export function trackTinValidation(entityType: string, valid: boolean) {
  tinValidations.inc({ entity_type: entityType, valid: valid.toString() });
}

export function trackFileUpload(fileType: string, status: 'success' | 'failed') {
  fileUploads.inc({ file_type: fileType, status });
}

export function trackDatabaseQuery(table: string, operation: string, duration: number) {
  databaseQueries.inc({ table, operation });
  databaseQueryDuration.observe({ table, operation }, duration / 1000);
}

export function trackAuthAttempt(type: 'login' | 'magic_link', status: 'success' | 'failed') {
  authAttempts.inc({ type, status });
}

export function trackError(service: string, errorType: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  applicationErrors.inc({ service, error_type: errorType, severity });
}

// Performance timing helper
export function timeOperation<T>(
  metric: Histogram<string>,
  labels: Record<string, string | number>,
  operation: () => Promise<T>
): Promise<T> {
  const end = metric.startTimer(labels);
  
  return operation()
    .finally(() => {
      end();
    });
}

// Update gauge metrics periodically
export function startPeriodicMetricsCollection() {
  setInterval(async () => {
    try {
      // These would typically query your database
      // For now, we'll use placeholder logic
      
      // Update active users (would query session store)
      // activeUsers.set(await getActiveUserCount());
      
      // Update invoice status counts (would query database)
      // const statusCounts = await getInvoiceStatusCounts();
      // Object.entries(statusCounts).forEach(([status, count]) => {
      //   invoiceStatusGauge.set({ status }, count);
      // });
      
      // Update organization counts
      // const orgCounts = await getOrganizationCounts();
      // Object.entries(orgCounts).forEach(([type, count]) => {
      //   organizationsByType.set({ business_type: type }, count);
      // });
      
      logger.debug('Periodic metrics collection completed');
    } catch (error) {
      logger.error('Failed to collect periodic metrics', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, 60000); // Update every minute
}

// Graceful metrics export endpoint
export async function getMetrics(): Promise<string> {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error('Failed to collect metrics', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

export default {
  register,
  metricsMiddleware,
  getMetrics,
  startPeriodicMetricsCollection,
  trackInvoiceOperation,
  trackValidationResult,
  trackMalaysianRule,
  trackTinValidation,
  trackFileUpload,
  trackDatabaseQuery,
  trackAuthAttempt,
  trackError,
  timeOperation
};