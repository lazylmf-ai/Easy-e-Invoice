'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { ErrorBoundary, InvoiceErrorFallback, useErrorHandler } from '@/components/ErrorBoundary';
import { AsyncErrorBoundary, useAsyncErrorHandler } from '@/components/error/ErrorBoundary';

function CreateInvoicePageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationResults, setValidationResults] = useState<any>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Error handling hooks
  const reportError = useErrorHandler();
  const handleAsyncError = useAsyncErrorHandler();

  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [searchParams]);

  const loadTemplate = async (templateId: string) => {
    try {
      const response = await api.templates.use(templateId);
      if (response.template) {
        setTemplateData(response.template.templateData);
      }
    } catch (error: any) {
      console.error('Failed to load template:', error);
      const errorMsg = 'Failed to load template';
      setError(errorMsg);
      
      // Report to error monitoring
      handleAsyncError(new Error(`Template Loading Error: ${error.message || errorMsg}`));
    }
  };

  const handleSubmit = async (data: any) => {
    if (!user?.hasCompletedOnboarding) {
      setError('Please complete organization setup first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.invoices.create(data);
      
      if (response.invoice) {
        // Show success message and redirect
        router.push(`/invoices/${response.invoice.id}`);
      } else {
        throw new Error('Failed to create invoice - invalid response');
      }
    } catch (error: any) {
      console.error('Invoice creation failed:', error);
      const errorMsg = error.message || 'Failed to create invoice. Please try again.';
      setError(errorMsg);
      
      // Report critical errors to monitoring
      if (error.name === 'TypeError' || error.name === 'NetworkError') {
        handleAsyncError(new Error(`Invoice Creation Critical Error: ${errorMsg}`));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (data: any) => {
    setIsLoading(true);
    setError('');

    try {
      // Create a temporary invoice for validation
      const response = await api.invoices.validate(data);
      setValidationResults(response.validation);
    } catch (error: any) {
      console.error('Invoice validation failed:', error);
      const errorMsg = error.message || 'Failed to validate invoice';
      setError(errorMsg);
      
      // Report validation errors for Malaysian compliance issues
      if (errorMsg.includes('TIN') || errorMsg.includes('SST') || errorMsg.includes('LHDN')) {
        reportError(new Error(`Malaysian e-Invoice Validation Error: ${errorMsg}`), {
          feature: 'invoice_validation',
          compliance_system: 'lhdn',
          invoice_data: JSON.stringify({
            // Only include non-sensitive fields for debugging
            lineItemCount: data.lineItems?.length,
            hasValidation: !!data.invoice,
            invoiceType: data.invoice?.eInvoiceType
          })
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Organization Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You need to complete your organization setup before creating invoices.</p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <button
                      onClick={() => router.push('/org/setup')}
                      className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                    >
                      Complete Setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
              <p className="mt-2 text-gray-600">
                Create a new e-Invoice with Malaysian compliance validation
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/invoices')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {validationResults && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Validation Results (Score: {validationResults.score}/100)
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  {validationResults.isValid ? (
                    <p>✅ Invoice passed Malaysian e-Invoice validation!</p>
                  ) : (
                    <div>
                      <p>❌ Invoice has validation issues:</p>
                      <ul className="mt-2 list-disc list-inside">
                        {validationResults.results?.map((result: any, index: number) => (
                          <li key={index} className={result.severity === 'error' ? 'text-red-700' : 'text-yellow-700'}>
                            {result.message} - {result.fixSuggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <ErrorBoundary fallback={InvoiceErrorFallback}>
          <InvoiceForm
            onSubmit={handleSubmit}
            onValidate={handleValidate}
            isLoading={isLoading}
            templateData={templateData}
            mode="create"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <AsyncErrorBoundary fallback={InvoiceErrorFallback}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <CreateInvoicePageContent />
      </Suspense>
    </AsyncErrorBoundary>
  );
}