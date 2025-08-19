'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  DocumentTextIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface DashboardMetrics {
  invoices: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    draft: number;
    validated: number;
    submitted: number;
    approved: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    currency: string;
  };
  compliance: {
    averageScore: number;
    fullyCompliant: number;
    needsAttention: number;
    criticalIssues: number;
  };
  activity: {
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      amount: string;
      currency: string;
      status: string;
      validationScore: number;
      createdAt: string;
    }>;
    upcomingDueDates: Array<{
      id: string;
      invoiceNumber: string;
      buyerName: string;
      amount: string;
      currency: string;
      dueDate: string;
      daysToDue: number;
    }>;
  };
  templates: {
    total: number;
    mostUsed: string | null;
    totalUsage: number;
  };
  trends: {
    monthlyInvoiceCount: Array<{ month: string; count: number }>;
    monthlyRevenue: Array<{ month: string; amount: number }>;
    complianceScores: Array<{ date: string; score: number }>;
  };
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user?.hasCompletedOnboarding) {
      fetchDashboardMetrics();
    } else if (isAuthenticated && !user?.hasCompletedOnboarding) {
      router.push('/org/setup');
    }
  }, [isAuthenticated, user?.hasCompletedOnboarding]);

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const response = await api.dashboard.getMetrics();
      setMetrics(response.metrics);
    } catch (error: any) {
      console.error('Failed to fetch dashboard metrics:', error);
      setError('Failed to load dashboard data');
    } finally {
      setMetricsLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceStatus = (score: number) => {
    if (score === 100) return 'Fully Compliant';
    if (score >= 90) return 'Minor Issues';
    if (score >= 70) return 'Needs Attention';
    return 'Critical Issues';
  };

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

  if (!user?.hasCompletedOnboarding) {
    return null; // Will redirect to setup
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Malaysian e-Invoice compliance overview for {user?.organization?.name}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
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

        {metricsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard metrics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Invoices */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Invoices
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {metrics?.invoices.total || 0}
                          </div>
                          {metrics && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                              calculatePercentageChange(metrics.invoices.thisMonth, metrics.invoices.lastMonth) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {calculatePercentageChange(metrics.invoices.thisMonth, metrics.invoices.lastMonth) >= 0 ? (
                                <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                              ) : (
                                <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {calculatePercentageChange(metrics.invoices.thisMonth, metrics.invoices.lastMonth) >= 0 ? 'Increased' : 'Decreased'} by
                              </span>
                              {Math.abs(calculatePercentageChange(metrics.invoices.thisMonth, metrics.invoices.lastMonth))}%
                            </div>
                          )}
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          {metrics?.invoices.thisMonth || 0} this month
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyDollarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Revenue
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {metrics?.revenue.currency || 'MYR'} {metrics?.revenue.total.toLocaleString() || '0'}
                          </div>
                          {metrics && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                              calculatePercentageChange(metrics.revenue.thisMonth, metrics.revenue.lastMonth) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {calculatePercentageChange(metrics.revenue.thisMonth, metrics.revenue.lastMonth) >= 0 ? (
                                <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                              ) : (
                                <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                              )}
                              {Math.abs(calculatePercentageChange(metrics.revenue.thisMonth, metrics.revenue.lastMonth))}%
                            </div>
                          )}
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          {metrics?.revenue.currency || 'MYR'} {metrics?.revenue.thisMonth.toLocaleString() || '0'} this month
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Score */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Avg Compliance Score
                        </dt>
                        <dd className="flex items-baseline">
                          <div className={`text-2xl font-semibold ${getComplianceColor(metrics?.compliance.averageScore || 0)}`}>
                            {metrics?.compliance.averageScore || 0}/100
                          </div>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          {getComplianceStatus(metrics?.compliance.averageScore || 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <StarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Templates
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {metrics?.templates.total || 0}
                          </div>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          {metrics?.templates.totalUsage || 0} total uses
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Invoice Status */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Invoice Status Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Draft</span>
                      <div className="flex items-center">
                        <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-gray-400 rounded-full" 
                            style={{ width: `${((metrics?.invoices.draft || 0) / Math.max(metrics?.invoices.total || 1, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{metrics?.invoices.draft || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Validated</span>
                      <div className="flex items-center">
                        <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${((metrics?.invoices.validated || 0) / Math.max(metrics?.invoices.total || 1, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{metrics?.invoices.validated || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Submitted</span>
                      <div className="flex items-center">
                        <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${((metrics?.invoices.submitted || 0) / Math.max(metrics?.invoices.total || 1, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{metrics?.invoices.submitted || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Approved</span>
                      <div className="flex items-center">
                        <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${((metrics?.invoices.approved || 0) / Math.max(metrics?.invoices.total || 1, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{metrics?.invoices.approved || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Breakdown */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Compliance Overview
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600">Fully Compliant</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{metrics?.compliance.fullyCompliant || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-sm text-gray-600">Needs Attention</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{metrics?.compliance.needsAttention || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-sm text-gray-600">Critical Issues</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{metrics?.compliance.criticalIssues || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Recent Invoices */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Recent Invoices
                    </h3>
                    <button
                      onClick={() => router.push('/invoices')}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {metrics?.activity.recentInvoices.length ? (
                      metrics.activity.recentInvoices.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.currency} {parseFloat(invoice.amount).toLocaleString()}
                            </div>
                            <div className={`text-xs ${getComplianceColor(invoice.validationScore)}`}>
                              Score: {invoice.validationScore}/100
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No recent invoices</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upcoming Due Dates */}
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Upcoming Due Dates
                    </h3>
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    {metrics?.activity.upcomingDueDates.length ? (
                      metrics.activity.upcomingDueDates.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            <div className="text-xs text-gray-500">{invoice.buyerName}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.currency} {parseFloat(invoice.amount).toLocaleString()}
                            </div>
                            <div className={`text-xs ${
                              invoice.daysToDue <= 7 ? 'text-red-600' : 
                              invoice.daysToDue <= 14 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {invoice.daysToDue} days left
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No upcoming due dates</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => router.push('/invoices/create')}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Create Invoice
                </button>
                <button
                  onClick={() => router.push('/invoices/import')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                  Import CSV
                </button>
                <button
                  onClick={() => router.push('/invoices/export')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export Data
                </button>
                <button
                  onClick={() => router.push('/templates')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <StarIcon className="h-5 w-5 mr-2" />
                  Manage Templates
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}