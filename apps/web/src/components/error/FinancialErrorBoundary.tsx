'use client';

import React from 'react';
import { ExclamationTriangleIcon, CalculatorIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { ErrorBoundary, type ErrorFallbackProps } from './ErrorBoundary';

// Financial calculation specific error fallback
const FinancialErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  errorId 
}) => {
  const isCalculationError = error?.message.includes('calculation') || 
                            error?.message.includes('precision') ||
                            error?.message.includes('NaN') ||
                            error?.message.includes('currency');
                            
  const isMalaysianComplianceError = error?.message.includes('SST') ||
                                   error?.message.includes('TIN') ||
                                   error?.message.includes('MYR') ||
                                   error?.message.includes('LHDN');

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isCalculationError ? (
            <CalculatorIcon className="h-6 w-6 text-red-400" />
          ) : isMalaysianComplianceError ? (
            <CurrencyDollarIcon className="h-6 w-6 text-amber-400" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {isCalculationError ? 'Calculation Error' :
             isMalaysianComplianceError ? 'Malaysian Compliance Error' :
             'Financial Processing Error'}
          </h3>
          
          <div className="mt-2 text-sm text-red-700">
            {isCalculationError && (
              <div className="space-y-2">
                <p>A calculation error occurred while processing your invoice amounts.</p>
                <div className="bg-red-100 p-3 rounded-md">
                  <h4 className="font-medium text-red-800">Common causes:</h4>
                  <ul className="mt-1 list-disc list-inside text-red-700">
                    <li>Invalid numerical values (negative quantities, non-numeric prices)</li>
                    <li>Floating-point precision issues with currency calculations</li>
                    <li>Division by zero in percentage calculations</li>
                    <li>Currency conversion errors</li>
                  </ul>
                </div>
              </div>
            )}
            
            {isMalaysianComplianceError && (
              <div className="space-y-2">
                <p>This error is related to Malaysian e-Invoice compliance requirements.</p>
                <div className="bg-amber-100 p-3 rounded-md">
                  <h4 className="font-medium text-amber-800">Please check:</h4>
                  <ul className="mt-1 list-disc list-inside text-amber-700">
                    <li>TIN format: C1234567890 or 123456789012</li>
                    <li>SST rates: 0%, 6%, or 10% only</li>
                    <li>Currency: MYR or proper exchange rates</li>
                    <li>LHDN compliance rules for your industry</li>
                  </ul>
                </div>
              </div>
            )}
            
            {!isCalculationError && !isMalaysianComplianceError && (
              <p>An unexpected error occurred while processing financial data. Please try again or contact support.</p>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-red-700">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border overflow-auto max-h-32">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={resetError}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Retry Calculation
            </button>
            
            <button
              onClick={() => {
                // Clear form data and reset
                resetError();
                window.location.reload();
              }}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Form
            </button>
            
            {errorId && (
              <span className="text-xs text-red-500 self-center">
                Error ID: {errorId}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error boundary for financial components
export function FinancialErrorBoundary({ 
  children,
  onError
}: { 
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log financial errors with specific context
    console.error('Financial calculation error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      type: 'financial_calculation'
    });
    
    // Report to monitoring with financial context
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          errorInfo,
          context: {
            type: 'financial_calculation',
            feature: 'invoice_calculations',
            compliance_system: 'lhdn',
            timestamp: new Date().toISOString()
          }
        })
      }).catch(err => console.error('Failed to report financial error:', err));
    }
    
    if (onError) {
      onError(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary 
      fallback={FinancialErrorFallback}
      onError={handleError}
      isolate={true}
    >
      {children}
    </ErrorBoundary>
  );
}

// HOC for wrapping financial components
export function withFinancialErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => (
    <FinancialErrorBoundary>
      <Component {...props} />
    </FinancialErrorBoundary>
  );
  
  WrappedComponent.displayName = `withFinancialErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default FinancialErrorBoundary;