'use client';

import React from 'react';
import { ErrorBoundary, InvoiceErrorFallback } from '@/components/ErrorBoundary';
import { AsyncErrorBoundary } from './ErrorBoundary';

// Global error reporting function
function reportGlobalError(error: Error, errorInfo: React.ErrorInfo, context?: Record<string, any>) {
  const errorData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    errorInfo: {
      componentStack: errorInfo.componentStack
    },
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      system: 'malaysian_einvoice',
      compliance: 'lhdn',
      ...context
    },
    performance: {
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null,
      timing: performance.timing ? {
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
      } : null
    }
  };

  // Log to console with Malaysian e-Invoice context
  console.group('🇲🇾 Malaysian e-Invoice System Error');
  console.error('Error:', error);
  console.error('Component Stack:', errorInfo.componentStack);
  console.table(errorData.context);
  console.groupEnd();

  // Send to monitoring service
  if (typeof window !== 'undefined') {
    // Report to custom error endpoint
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(reportError => {
      console.error('Failed to report error to monitoring:', reportError);
    });

    // Report to Sentry if available
    if ((window as any).Sentry) {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('system', 'malaysian_einvoice');
        scope.setTag('compliance', 'lhdn');
        scope.setTag('country', 'MY');
        scope.setLevel('error');
        
        Object.entries(errorData.context).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            scope.setTag(key, String(value));
          } else {
            scope.setContext(key, value);
          }
        });
        
        scope.setContext('errorInfo', errorInfo);
        (window as any).Sentry.captureException(error);
      });
    }
  }
}

// Global error boundary component
export function GlobalErrorBoundary({ 
  children,
  context = {}
}: { 
  children: React.ReactNode;
  context?: Record<string, any>;
}) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    reportGlobalError(error, errorInfo, context);
  };

  return (
    <ErrorBoundary fallback={InvoiceErrorFallback}>
      <AsyncErrorBoundary fallback={InvoiceErrorFallback}>
        {children}
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
}

// HOC for wrapping page components with global error boundary
export function withGlobalErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: Record<string, any>
) {
  const WrappedComponent = (props: P) => (
    <GlobalErrorBoundary context={context}>
      <Component {...props} />
    </GlobalErrorBoundary>
  );
  
  WrappedComponent.displayName = `withGlobalErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Error boundary for critical business operations
export function CriticalOperationBoundary({ 
  children,
  operation,
  onError
}: { 
  children: React.ReactNode;
  operation: string;
  onError?: (error: Error) => void;
}) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    reportGlobalError(error, errorInfo, {
      operation,
      critical: true,
      requires_immediate_attention: true
    });
    
    if (onError) {
      onError(error);
    }
  };

  const CriticalErrorFallback = ({ error, resetError }: any) => (
    <div className="bg-red-100 border-l-4 border-red-500 p-4 my-4">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Critical Operation Failed: {operation}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>This operation is critical for Malaysian e-Invoice compliance.</p>
            <p className="mt-1 font-medium">
              Please contact support immediately with error details.
            </p>
          </div>
          <div className="mt-4">
            <div className="flex space-x-2">
              <button
                onClick={resetError}
                className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
              >
                Retry Operation
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={CriticalErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

export default GlobalErrorBoundary;