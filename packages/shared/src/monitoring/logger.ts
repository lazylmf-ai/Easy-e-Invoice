import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Log levels for different environments
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Custom log format for Malaysian e-Invoice compliance
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(({ timestamp, level, message, service, userId, organizationId, invoiceId, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: service || 'unknown',
      message,
      ...(userId && { userId }),
      ...(organizationId && { organizationId }),
      ...(invoiceId && { invoiceId }),
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

// Create base logger configuration
function createBaseLogger(serviceName: string): Logger {
  const logger = createLogger({
    levels: LOG_LEVELS,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport for development
      new transports.Console({
        format: process.env.NODE_ENV === 'development' 
          ? format.combine(
              format.colorize(),
              format.simple(),
              format.printf(({ timestamp, level, message, service, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
              })
            )
          : format.json()
      }),
      
      // File transport for production
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat
      }),
      
      // Error-specific file
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat
      }),
      
      // Audit trail for compliance
      new DailyRotateFile({
        filename: 'logs/audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        maxSize: '100m',
        maxFiles: '365d',
        format: format.combine(
          format.timestamp(),
          format.json(),
          format.printf(({ timestamp, level, message, ...meta }) => {
            // Only log audit events
            if (meta.action && meta.resource) {
              return JSON.stringify({
                timestamp,
                action: meta.action,
                resource: meta.resource,
                userId: meta.userId,
                organizationId: meta.organizationId,
                details: meta.details,
                ip: meta.ip,
                userAgent: meta.userAgent
              });
            }
            return '';
          })
        )
      })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
      new transports.File({ filename: 'logs/exceptions.log' })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new transports.File({ filename: 'logs/rejections.log' })
    ],
    
    exitOnError: false
  });

  return logger;
}

// Specialized loggers for different services
export const apiLogger = createBaseLogger('api');
export const webLogger = createBaseLogger('web');
export const validationLogger = createBaseLogger('validation');
export const auditLogger = createBaseLogger('audit');

// Context-aware logging interface
export interface LogContext {
  userId?: string;
  organizationId?: string;
  invoiceId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  action?: string;
  resource?: string;
  details?: any;
}

// Enhanced logger with context
export class ContextLogger {
  private logger: Logger;
  private context: LogContext;

  constructor(logger: Logger, context: LogContext = {}) {
    this.logger = logger;
    this.context = context;
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): ContextLogger {
    return new ContextLogger(this.logger, { ...this.context, ...additionalContext });
  }

  // Log methods with context injection
  error(message: string, meta?: any) {
    this.logger.error(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { ...this.context, ...meta });
  }

  info(message: string, meta?: any) {
    this.logger.info(message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { ...this.context, ...meta });
  }

  // Audit logging for compliance tracking
  audit(action: string, resource: string, details?: any) {
    this.logger.info('Audit event', {
      ...this.context,
      action,
      resource,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: any) {
    this.logger.info('Performance metric', {
      ...this.context,
      operation,
      duration,
      ...meta
    });
  }

  // Security event logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) {
    this.logger.warn('Security event', {
      ...this.context,
      securityEvent: event,
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Malaysian compliance logging
  compliance(rule: string, status: 'passed' | 'failed' | 'warning', details?: any) {
    this.logger.info('Compliance check', {
      ...this.context,
      complianceRule: rule,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to create context-aware logger
export function createContextLogger(serviceName: string, context: LogContext = {}): ContextLogger {
  const baseLogger = createBaseLogger(serviceName);
  return new ContextLogger(baseLogger, context);
}

// Express middleware for request logging
export function requestLoggingMiddleware(logger: ContextLogger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Create request-specific logger
    const requestLogger = logger.child({
      requestId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl
    });

    // Attach logger to request object
    req.logger = requestLogger;

    // Log request start
    requestLogger.info('Request started', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      
      requestLogger.info('Request completed', {
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length')
      });

      // Log performance metrics
      requestLogger.performance('http_request', duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode
      });

      originalEnd.apply(this, args);
    };

    next();
  };
}

// Structured error logging
export function logError(logger: ContextLogger, error: Error, context?: any) {
  logger.error('Application error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
}

// Performance monitoring helper
export function withPerformanceLogging<T>(
  logger: ContextLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn()
    .then(result => {
      const duration = Date.now() - start;
      logger.performance(operation, duration, { status: 'success' });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.performance(operation, duration, { status: 'error' });
      logger.error(`Operation ${operation} failed`, { error: error.message, duration });
      throw error;
    });
}

export default {
  apiLogger,
  webLogger,
  validationLogger,
  auditLogger,
  createContextLogger,
  requestLoggingMiddleware,
  logError,
  withPerformanceLogging
};