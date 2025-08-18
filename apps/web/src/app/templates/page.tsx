'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  StarIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  version: number;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  isOwned: boolean;
}

interface TemplateAnalytics {
  totalTemplates: number;
  totalUsage: number;
  averageUsage: number;
  categoryStats: Record<string, number>;
  mostUsed: Template | null;
}

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
  { value: 'professional-services', label: 'Professional Services', color: 'bg-blue-100 text-blue-800' },
  { value: 'retail', label: 'Retail', color: 'bg-green-100 text-green-800' },
  { value: 'manufacturing', label: 'Manufacturing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hospitality', label: 'Hospitality', color: 'bg-purple-100 text-purple-800' },
  { value: 'technology', label: 'Technology', color: 'bg-indigo-100 text-indigo-800' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'usageCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
    fetchAnalytics();
  }, [selectedCategory, searchTerm, sortBy, sortOrder]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await api.templates.list({
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
        includePublic: true,
      });
      setTemplates(response.templates || []);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.templates.getAnalytics();
      setAnalytics(response.analytics);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await api.templates.use(templateId);
      // Navigate to create invoice with template data
      router.push(`/invoices/create?template=${templateId}`);
    } catch (error: any) {
      console.error('Failed to use template:', error);
      setError('Failed to apply template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await api.templates.delete(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setDeleteConfirm(null);
      fetchAnalytics(); // Refresh analytics
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      setError('Failed to delete template');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (!user?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Organization Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Complete your organization setup before managing templates.</p>
                </div>
                <div className="mt-4">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Templates</h1>
              <p className="mt-2 text-gray-600">
                Create and manage reusable invoice templates for faster invoicing
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="btn-secondary flex items-center"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/templates/create')}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Template
              </button>
            </div>
          </div>
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

        {/* Analytics Panel */}
        {showAnalytics && analytics && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Usage Analytics</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalTemplates}</div>
                <div className="text-sm text-blue-600">Total Templates</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analytics.totalUsage}</div>
                <div className="text-sm text-green-600">Total Usage</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{analytics.averageUsage.toFixed(1)}</div>
                <div className="text-sm text-yellow-600">Average Usage</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{analytics.mostUsed?.name || 'N/A'}</div>
                <div className="text-sm text-purple-600">Most Used</div>
              </div>
            </div>
            
            {Object.keys(analytics.categoryStats).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Usage by Category</h4>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Object.entries(analytics.categoryStats).map(([category, count]) => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{categoryInfo.label}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Templates
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="usageCount">Usage Count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="input"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="bg-white shadow-sm rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first template.'
                }
              </p>
              {!searchTerm && !selectedCategory && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/templates/create')}
                    className="btn-primary"
                  >
                    Create Template
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const categoryInfo = getCategoryInfo(template.category);
                return (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {template.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center ml-2">
                        {template.isPublic && (
                          <StarIconSolid className="h-4 w-4 text-yellow-400" />
                        )}
                        <span className="ml-1 text-xs text-gray-500">v{template.version}</span>
                      </div>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>Used {template.usageCount} times</span>
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleUseTemplate(template.id)}
                        className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        Use Template
                      </button>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/templates/${template.id}`)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {template.isOwned && (
                          <>
                            <button
                              onClick={() => router.push(`/templates/${template.id}/edit`)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(template.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Template</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this template? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(deleteConfirm)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}