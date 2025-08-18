'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import OrganizationSetupWizard from '@/components/org/OrganizationSetupWizard';

export default function OrganizationSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleSetupComplete = async (organizationData: any) => {
    setIsLoading(true);
    setError('');

    try {
      // Call the organization setup API
      const response = await api.organization.setup(organizationData);
      
      if (response.success) {
        // Refresh user data to get updated organization info
        await refreshUser();
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        throw new Error(response.message || 'Failed to setup organization');
      }
    } catch (error: any) {
      console.error('Organization setup failed:', error);
      setError(error.message || 'Failed to setup organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">🇲🇾</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Setup</h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Set up your organization for Malaysian e-Invoice compliance. 
            This will enable you to create, validate, and export compliant e-Invoices according to LHDN requirements.
          </p>
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
                <h3 className="text-sm font-medium text-red-800">Setup Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg p-6">
          <OrganizationSetupWizard 
            onComplete={handleSetupComplete}
            isLoading={isLoading}
          />
        </div>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h4>
            <p className="text-sm text-blue-700">
              If you need assistance with your TIN, industry codes, or SST registration, 
              contact our support team at{' '}
              <a href="mailto:support@easyeinvoice.my" className="underline">
                support@easyeinvoice.my
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}