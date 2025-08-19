'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  HomeIcon, 
  BugAntIcon 
} from '@heroicons/react/24/outline';

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Error fallback props
export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  errorId: string | null;
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>

        {errorId && (
          <div className="bg-gray-100 rounded-md p-3 mb-6">
            <p className="text-sm text-gray-700">
              Error ID: <code className="font-mono">{errorId}</code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Please provide this ID when contacting support
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Go Home
          </button>

          {isDevelopment && (
            <button
              onClick={() => {
                const details = {
                  error: error?.message,
                  stack: error?.stack,
                  componentStack: errorInfo?.componentStack
                };
                console.group('🐛 Error Details');
                console.error('Error:', error);
                console.error('Error Info:', errorInfo);
                console.groupEnd();
                
                // Copy to clipboard
                navigator.clipboard.writeText(JSON.stringify(details, null, 2));
                alert('Error details copied to clipboard');
              }}
              className="w-full flex items-center justify-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <BugAntIcon className="h-4 w-4 mr-2" />
              Copy Error Details
            </button>
          )}
        </div>

        {isDevelopment && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Technical Details (Development)
            </summary>
            <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                {error.name}: {error.message}
              </h3>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
              {errorInfo?.componentStack && (
                <>
                  <h4 className="text-sm font-semibold text-red-800 mt-3 mb-2">
                    Component Stack:
                  </h4>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Minimal error fallback for isolated components
const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ resetError }) => (
  <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="text-center">
      <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-700 mb-3">
        This component failed to load
      </p>
      <button
        onClick={resetError}
        className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300"
      >
        Retry
      </button>
    </div>
  </div>
);

// Main error boundary class
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };

    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to monitoring service
    this.reportError(error, errorInfo);
  }

  // Report error to monitoring services
  private reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Report to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.withScope((scope: any) => {
          scope.setTag('errorBoundary', true);
          scope.setContext('errorInfo', {
            componentStack: errorInfo.componentStack
          });
          (window as any).Sentry.captureException(error);
        });
      }

      // Report to custom error tracking
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            errorInfo: {
              componentStack: errorInfo.componentStack
            },
            errorId: this.state.errorId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        }).catch(reportError => {
          console.error('Failed to report error:', reportError);
        });
      }
    } catch (reportingError) {
      console.error('Error while reporting error:', reportingError);
    }
  }

  // Reset error state
  resetError() {
    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  }

  // Auto-retry after delay
  private scheduleRetry(delay: number = 5000) {
    this.retryTimeoutId = window.setTimeout(() => {
      console.log('Auto-retrying after error...');
      this.resetError();
    }, delay);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || 
        (this.props.isolate ? MinimalErrorFallback : DefaultErrorFallback);

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Error captured by useErrorHandler:', error);
    setError(error);

    // Report error
    if (typeof window !== 'undefined') {
      // Report to Sentry
      if ((window as any).Sentry) {
        (window as any).Sentry.captureException(error);
      }

      // Custom error reporting
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).catch(reportError => {
        console.error('Failed to report error:', reportError);
      });
    }
  }, []);

  // Throw error to be caught by nearest error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Async error boundary for handling async operations
export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: React.ComponentType<ErrorFallbackProps>;
}) {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null);

  // Reset async error
  const resetAsyncError = React.useCallback(() => {
    setAsyncError(null);
  }, []);

  // Provide async error handler to children
  const handleAsyncError = React.useCallback((error: Error) => {
    console.error('Async error caught:', error);
    setAsyncError(error);
  }, []);

  // Context for async error handling
  const asyncErrorContext = React.useMemo(() => ({
    handleAsyncError
  }), [handleAsyncError]);

  if (asyncError) {
    const FallbackComponent = fallback || DefaultErrorFallback;
    return (
      <FallbackComponent
        error={asyncError}
        errorInfo={null}
        resetError={resetAsyncError}
        errorId={null}
      />
    );
  }

  return (
    <AsyncErrorContext.Provider value={asyncErrorContext}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AsyncErrorContext.Provider>
  );
}

// Context for async error handling
const AsyncErrorContext = React.createContext<{
  handleAsyncError: (error: Error) => void;
} | null>(null);

// Hook for handling async errors
export function useAsyncErrorHandler() {
  const context = React.useContext(AsyncErrorContext);
  
  if (!context) {
    throw new Error('useAsyncErrorHandler must be used within AsyncErrorBoundary');
  }

  return context.handleAsyncError;
}

export default ErrorBoundary;