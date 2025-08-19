'use client';

import React from 'react';
// Mock Sentry implementation for deployment
const Sentry = {
  captureException: (error: Error) => {
    console.error('Error captured:', error);
    return 'mock-event-id';
  },
  withScope: (callback: (scope: any) => void) => {
    const mockScope = {
      setTag: (key: string, value: string) => {},
      setLevel: (level: string) => {},
      setContext: (key: string, value: any) => {}
    };
    callback(mockScope);
  }
};
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  eventId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

// Default fallback component for errors
function DefaultErrorFallback({ error, resetError, eventId }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              An error occurred while processing your Malaysian e-Invoice request. 
              Our team has been notified and will investigate the issue.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Technical Details (Development Mode)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border overflow-auto max-h-40">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
                {eventId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Error ID: {eventId}
                  </p>
                )}
              </details>
            )}
            
            <div className="mt-6 space-y-3">
              <button
                onClick={resetError}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Back to Dashboard
              </button>
              
              {eventId && (
                <div className="text-xs text-gray-500">
                  <p>If you continue to experience issues, please contact support and reference error ID: {eventId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Malaysian e-Invoice specific error fallback
export function InvoiceErrorFallback({ error, resetError, eventId }: ErrorFallbackProps) {
  const isValidationError = error.message.includes('validation') || error.message.includes('TIN');
  const isComplianceError = error.message.includes('compliance') || error.message.includes('LHDN');
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-400" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              {isValidationError ? 'Invoice Validation Error' : 
               isComplianceError ? 'Compliance Issue' : 
               'Processing Error'}
            </h2>
            
            <div className="mt-4 text-sm text-gray-600">
              {isValidationError && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <p className="font-medium text-amber-800">Malaysian e-Invoice Validation Failed</p>
                  <p className="mt-1">Please check your invoice data for LHDN compliance requirements:</p>
                  <ul className="mt-2 text-left list-disc list-inside space-y-1">
                    <li>TIN format (C1234567890 or 123456789012)</li>
                    <li>SST calculations (6% where applicable)</li>
                    <li>Currency and exchange rate requirements</li>
                    <li>Industry-specific B2C consolidation rules</li>
                  </ul>
                </div>
              )}
              
              {isComplianceError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="font-medium text-red-800">LHDN Compliance Error</p>
                  <p className="mt-1">This invoice does not meet Malaysian regulatory requirements. Please review and correct before resubmitting.</p>
                </div>
              )}
              
              {!isValidationError && !isComplianceError && (
                <p>An unexpected error occurred while processing your Malaysian e-Invoice. Please try again or contact support if the issue persists.</p>
              )}
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Technical Details (Development Mode)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border overflow-auto max-h-40">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}
            
            <div className="mt-6 space-y-3">
              <button
                onClick={resetError}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.location.href = '/invoices'}
                  className="flex justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View Invoices
                </button>
                <button
                  onClick={() => window.location.href = '/help'}
                  className="flex justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Get Help
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture the error with Sentry and add Malaysian e-Invoice context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setTag('country', 'MY');
      scope.setTag('compliance_system', 'lhdn');
      scope.setTag('business_context', 'malaysian_einvoice');
      
      // Add React error info
      scope.setContext('react_error_info', {
        componentStack: errorInfo.componentStack,
      });
      
      // Add Malaysian business context if available
      const currentPath = window.location.pathname;
      if (currentPath.includes('/invoices')) {
        scope.setTag('feature', 'invoice_management');
      } else if (currentPath.includes('/templates')) {
        scope.setTag('feature', 'template_management');
      } else if (currentPath.includes('/import')) {
        scope.setTag('feature', 'csv_import');
      } else if (currentPath.includes('/export')) {
        scope.setTag('feature', 'data_export');
      }
      
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });

    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={() => this.setState({ hasError: false, error: undefined, eventId: undefined })}
          eventId={this.state.eventId}
        />
      );
    }

    return this.props.children;
  }
}

// Hook for manual error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag('manual_report', true);
      scope.setTag('country', 'MY');
      scope.setTag('compliance_system', 'lhdn');
      
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            scope.setTag(key, String(value));
          } else {
            scope.setContext(key, value);
          }
        });
      }
      
      const eventId = Sentry.captureException(error);
      console.error('Manual error report:', error, context);
      return eventId;
    });
  }, []);
}

export default ErrorBoundary;