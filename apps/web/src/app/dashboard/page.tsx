'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Easy e-Invoice
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.organization?.name || 'Welcome'}
              </span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Dashboard
              </h1>
              <p className="text-gray-600 mb-8">
                Welcome to your Malaysian e-Invoice compliance dashboard
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                <button
                  onClick={() => router.push('/invoices/create')}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">Create Invoice</div>
                  <div className="text-sm opacity-90">Start a new e-Invoice</div>
                </button>
                
                <button
                  onClick={() => router.push('/invoices')}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">View Invoices</div>
                  <div className="text-sm opacity-90">Manage existing invoices</div>
                </button>
                
                <button
                  onClick={() => router.push('/invoices/import')}
                  className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">Import CSV</div>
                  <div className="text-sm opacity-90">Bulk import invoices</div>
                </button>
                
                <button
                  onClick={() => router.push('/invoices/export')}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">Export Data</div>
                  <div className="text-sm opacity-90">PDF, JSON, CSV exports</div>
                </button>
                
                <button
                  onClick={() => router.push('/templates')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">Templates</div>
                  <div className="text-sm opacity-90">Manage invoice templates</div>
                </button>
                
                <button
                  onClick={() => router.push('/org/setup')}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow transition-colors"
                >
                  <div className="text-xl font-semibold mb-2">Organization</div>
                  <div className="text-sm opacity-90">Update company settings</div>
                </button>
              </div>
              
              {user?.organization && (
                <div className="card max-w-md mx-auto">
                  <div className="card-header">
                    <h3 className="text-lg font-medium">Organization Info</h3>
                  </div>
                  <div className="card-body">
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="text-sm text-gray-900">{user.organization.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">TIN</dt>
                        <dd className="text-sm text-gray-900">{user.organization.tin}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Currency</dt>
                        <dd className="text-sm text-gray-900">{user.organization.currency}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">SST Registered</dt>
                        <dd className="text-sm text-gray-900">
                          {user.organization.isSstRegistered ? 'Yes' : 'No'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}