// Centralized error handling for Malaysian e-Invoice system
import { createContextLogger } from '../monitoring/logger';
import { captureError, captureValidationError } from '../monitoring/sentry';
import { alertManager } from '../monitoring/alerting';

const logger = createContextLogger('error-handler');

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  FILE_PROCESSING = 'file_processing',
  MALAYSIAN_COMPLIANCE = 'malaysian_compliance',
  RATE_LIMIT = 'rate_limit',
  SYSTEM = 'system',
  EXTERNAL_API = 'external_api'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Base application error
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      // Only include context in development
      ...(process.env.NODE_ENV === 'development' && { context: this.context })
    };
  }

  // Get user-friendly message
  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return 'The information provided is not valid. Please check your input and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.NETWORK:
        return 'Network connection error. Please check your internet connection and try again.';
      case ErrorType.DATABASE:
        return 'A database error occurred. Please try again later.';
      case ErrorType.FILE_PROCESSING:
        return 'File processing failed. Please check your file format and try again.';
      case ErrorType.MALAYSIAN_COMPLIANCE:
        return 'Malaysian e-Invoice compliance check failed. Please review the requirements.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorType.EXTERNAL_API:
        return 'External service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}

// Specific error classes
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;
  public readonly rule?: string;

  constructor(
    message: string,
    field?: string,
    value?: any,
    rule?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      400,
      true,
      { field, value, rule, ...context }
    );
    
    this.field = field;
    this.value = value;
    this.rule = rule;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(
      message,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      true,
      context
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, any>) {
    super(
      message,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      true,
      context
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      ErrorType.SYSTEM,
      ErrorSeverity.LOW,
      404,
      true,
      { resource, id }
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorType.SYSTEM,
      ErrorSeverity.MEDIUM,
      409,
      true,
      context
    );
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60, context?: Record<string, any>) {
    super(
      'Rate limit exceeded',
      ErrorType.RATE_LIMIT,
      ErrorSeverity.LOW,
      429,
      true,
      { retryAfter, ...context }
    );
    
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, context?: Record<string, any>) {
    super(
      message,
      ErrorType.DATABASE,
      ErrorSeverity.HIGH,
      500,
      true,
      { operation, ...context }
    );
  }
}

export class FileProcessingError extends AppError {
  public readonly fileName?: string;
  public readonly fileType?: string;
  public readonly fileSize?: number;

  constructor(
    message: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorType.FILE_PROCESSING,
      ErrorSeverity.MEDIUM,
      422,
      true,
      { fileName, fileType, fileSize, ...context }
    );
    
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileSize = fileSize;
  }
}

export class MalaysianComplianceError extends AppError {
  public readonly ruleCode?: string;
  public readonly requirement?: string;

  constructor(
    message: string,
    ruleCode?: string,
    requirement?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorType.MALAYSIAN_COMPLIANCE,
      ErrorSeverity.HIGH,
      422,
      true,
      { ruleCode, requirement, ...context }
    );
    
    this.ruleCode = ruleCode;
    this.requirement = requirement;
  }
}

export class ExternalAPIError extends AppError {
  public readonly apiName?: string;
  public readonly apiResponse?: any;

  constructor(
    message: string,
    apiName?: string,
    apiResponse?: any,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorType.EXTERNAL_API,
      ErrorSeverity.HIGH,
      502,
      true,
      { apiName, apiResponse, ...context }
    );
    
    this.apiName = apiName;
    this.apiResponse = apiResponse;
  }
}

// Error handling middleware for Express/Hono
export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle application errors
  async handleError(error: Error, context?: {
    userId?: string;
    organizationId?: string;
    requestId?: string;
    correlationId?: string;
    request?: any;
  }): Promise<void> {
    // Log the error
    this.logError(error, context);

    // Capture in Sentry if it's a significant error
    if (this.shouldCaptureInSentry(error)) {
      await this.captureInSentry(error, context);
    }

    // Trigger alerts for critical errors
    if (this.shouldTriggerAlert(error)) {
      await this.triggerAlert(error, context);
    }

    // Additional error handling based on type
    if (error instanceof AppError) {
      await this.handleAppError(error, context);
    }
  }

  // Log error with appropriate level
  private logError(error: Error, context?: any): void {
    const logContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    };

    if (error instanceof AppError) {
      logContext.type = error.type;
      logContext.severity = error.severity;
      logContext.statusCode = error.statusCode;
      logContext.isOperational = error.isOperational;
      logContext.correlationId = error.correlationId;

      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          logger.error('Critical error occurred', logContext);
          break;
        case ErrorSeverity.HIGH:
          logger.error('High severity error', logContext);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn('Medium severity error', logContext);
          break;
        case ErrorSeverity.LOW:
          logger.info('Low severity error', logContext);
          break;
      }
    } else {
      // Unknown error
      logger.error('Unknown error occurred', logContext);
    }
  }

  // Determine if error should be captured in Sentry
  private shouldCaptureInSentry(error: Error): boolean {
    if (error instanceof AppError) {
      // Capture high and critical errors, and non-operational errors
      return !error.isOperational || 
             error.severity === ErrorSeverity.HIGH || 
             error.severity === ErrorSeverity.CRITICAL;
    }
    
    // Capture all unknown errors
    return true;
  }

  // Capture error in Sentry
  private async captureInSentry(error: Error, context?: any): Promise<void> {
    try {
      if (error instanceof ValidationError || error instanceof MalaysianComplianceError) {
        captureValidationError(
          error,
          { id: 'unknown', number: 'unknown' },
          error instanceof MalaysianComplianceError ? error.ruleCode || 'unknown' : 'validation',
          context?.organizationId || 'unknown'
        );
      } else {
        captureError(error, {
          user: context?.userId ? { id: context.userId, organizationId: context.organizationId } : undefined,
          request: context?.request ? {
            id: context.requestId || 'unknown',
            method: context.request.method,
            url: context.request.url
          } : undefined,
          extra: {
            errorType: error instanceof AppError ? error.type : 'unknown',
            severity: error instanceof AppError ? error.severity : 'unknown',
            correlationId: context?.correlationId
          },
          level: this.getSentryLevel(error)
        });
      }
    } catch (sentryError) {
      logger.error('Failed to capture error in Sentry', { 
        originalError: error.message,
        sentryError: sentryError instanceof Error ? sentryError.message : 'Unknown error'
      });
    }
  }

  // Get Sentry error level
  private getSentryLevel(error: Error): 'info' | 'warning' | 'error' | 'fatal' {
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.LOW:
          return 'info';
        case ErrorSeverity.MEDIUM:
          return 'warning';
        case ErrorSeverity.HIGH:
          return 'error';
        case ErrorSeverity.CRITICAL:
          return 'fatal';
      }
    }
    return 'error';
  }

  // Determine if alert should be triggered
  private shouldTriggerAlert(error: Error): boolean {
    if (error instanceof AppError) {
      return error.severity === ErrorSeverity.CRITICAL || 
             (error.severity === ErrorSeverity.HIGH && !error.isOperational);
    }
    return true; // Trigger for unknown errors
  }

  // Trigger alert
  private async triggerAlert(error: Error, context?: any): Promise<void> {
    try {
      const alertData = {
        service: 'error-handler',
        severity: error instanceof AppError ? error.severity : 'critical',
        error: error.message,
        stack: error.stack,
        type: error instanceof AppError ? error.type : 'unknown',
        context: context || {},
        timestamp: new Date().toISOString()
      };

      await alertManager.triggerAlert('application_error', alertData);
    } catch (alertError) {
      logger.error('Failed to trigger alert', { 
        originalError: error.message,
        alertError: alertError instanceof Error ? alertError.message : 'Unknown error'
      });
    }
  }

  // Handle specific app error types
  private async handleAppError(error: AppError, context?: any): Promise<void> {
    switch (error.type) {
      case ErrorType.DATABASE:
        await this.handleDatabaseError(error as DatabaseError, context);
        break;
      case ErrorType.MALAYSIAN_COMPLIANCE:
        await this.handleComplianceError(error as MalaysianComplianceError, context);
        break;
      case ErrorType.FILE_PROCESSING:
        await this.handleFileProcessingError(error as FileProcessingError, context);
        break;
      case ErrorType.EXTERNAL_API:
        await this.handleExternalAPIError(error as ExternalAPIError, context);
        break;
    }
  }

  // Handle database errors
  private async handleDatabaseError(error: DatabaseError, context?: any): Promise<void> {
    // Log additional database context
    logger.error('Database error details', {
      operation: error.context?.operation,
      query: error.context?.query,
      params: error.context?.params
    });

    // Trigger database health check
    // This would integrate with your health check system
  }

  // Handle Malaysian compliance errors
  private async handleComplianceError(error: MalaysianComplianceError, context?: any): Promise<void> {
    // Log compliance violation
    logger.warn('Malaysian compliance violation', {
      ruleCode: error.ruleCode,
      requirement: error.requirement,
      organizationId: context?.organizationId,
      userId: context?.userId
    });

    // Track compliance metrics
    // This would integrate with your metrics system
  }

  // Handle file processing errors
  private async handleFileProcessingError(error: FileProcessingError, context?: any): Promise<void> {
    // Log file processing details
    logger.warn('File processing failed', {
      fileName: error.fileName,
      fileType: error.fileType,
      fileSize: error.fileSize,
      processingStep: error.context?.step
    });

    // Clean up temporary files if needed
    // This would integrate with your file cleanup system
  }

  // Handle external API errors
  private async handleExternalAPIError(error: ExternalAPIError, context?: any): Promise<void> {
    // Log API call details
    logger.error('External API call failed', {
      apiName: error.apiName,
      response: error.apiResponse,
      retryCount: error.context?.retryCount
    });

    // Implement retry logic or circuit breaker pattern
    // This would integrate with your API resilience system
  }

  // Express/Hono error middleware
  expressErrorHandler() {
    return async (err: Error, req: any, res: any, next: any) => {
      // Handle the error
      await this.handleError(err, {
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        requestId: req.id || req.headers['x-request-id'],
        request: {
          method: req.method,
          url: req.originalUrl || req.url,
          headers: req.headers,
          body: req.body
        }
      });

      // Send response
      if (err instanceof AppError) {
        res.status(err.statusCode).json({
          error: {
            message: err.getUserMessage(),
            code: err.type,
            correlationId: err.correlationId,
            timestamp: err.timestamp.toISOString()
          }
        });
      } else {
        // Unknown error - don't expose details
        res.status(500).json({
          error: {
            message: 'An unexpected error occurred',
            code: 'internal_server_error',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  // Process uncaught exceptions
  handleUncaughtException(error: Error): void {
    logger.error('Uncaught exception', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Capture in Sentry
    captureError(error, {
      level: 'fatal',
      extra: { uncaught: true }
    });

    // Trigger critical alert
    alertManager.triggerAlert('uncaught_exception', {
      service: 'application',
      severity: 'critical',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Graceful shutdown
    process.exit(1);
  }

  // Process unhandled promise rejections
  handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });

    // Capture in Sentry
    const error = reason instanceof Error ? reason : new Error(String(reason));
    captureError(error, {
      level: 'error',
      extra: { unhandledRejection: true }
    });

    // Don't exit process for promise rejections, but log them
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  const errorHandler = ErrorHandler.getInstance();

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    errorHandler.handleUncaughtException(error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    errorHandler.handleUnhandledRejection(reason, promise);
  });

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, starting graceful shutdown');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, starting graceful shutdown');
    process.exit(0);
  });
}

// Utility functions
export function createError(
  message: string,
  type: ErrorType,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  statusCode: number = 500,
  context?: Record<string, any>
): AppError {
  return new AppError(message, type, severity, statusCode, true, context);
}

export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}

export default {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  FileProcessingError,
  MalaysianComplianceError,
  ExternalAPIError,
  ErrorType,
  ErrorSeverity,
  setupGlobalErrorHandling,
  createError,
  isOperationalError,
  getErrorHandler
};