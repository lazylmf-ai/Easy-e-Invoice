'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { 
  DocumentArrowDownIcon, 
  Cog6ToothIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  grandTotal: string;
  status: string;
  buyerName?: string;
}

interface ExportJob {
  id: string;
  type: 'pdf' | 'json' | 'csv';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  elapsedTime: number;
  downloadUrl?: string;
  error?: string;
}

function ExportInvoicesPageContent() {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exportType, setExportType] = useState<'pdf' | 'json' | 'csv'>('pdf');
  const [exportOptions, setExportOptions] = useState({
    // PDF options
    includeQrCode: true,
    includeWatermark: true,
    watermarkText: 'DRAFT - FOR REVIEW ONLY',
    format: 'A4' as 'A4' | 'A5',
    language: 'en' as 'en' | 'ms',
    
    // JSON options
    jsonFormat: 'myinvois' as 'myinvois' | 'standard',
    includeLineItems: true,
    minifyOutput: false,
    
    // CSV options
    includeHeaders: true,
    dateFormat: 'ISO' as 'ISO' | 'DD/MM/YYYY' | 'MM/DD/YYYY',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [error, setError] = useState('');
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);
  
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get pre-selected invoice IDs from URL params
    const preselected = searchParams.get('invoices');
    if (preselected) {
      setSelectedInvoices(preselected.split(','));
    }
    
    fetchInvoices();
    fetchActiveJobs();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const response = await api.invoices.list();
      setInvoices(response.invoices || []);
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      setError('Failed to load invoices');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const fetchActiveJobs = async () => {
    // In a real implementation, you would fetch active jobs from an API
    // For now, we'll just maintain them in state
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleExport = async () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to export');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let response: Response;
      
      if (selectedInvoices.length <= 10) {
        // Direct export for small batches
        switch (exportType) {
          case 'pdf':
            response = await api.export.generatePDF({
              invoiceIds: selectedInvoices,
              includeQrCode: exportOptions.includeQrCode,
              includeWatermark: exportOptions.includeWatermark,
              watermarkText: exportOptions.watermarkText,
              format: exportOptions.format,
              language: exportOptions.language,
            });
            break;
          case 'json':
            response = await api.export.generateJSON({
              invoiceIds: selectedInvoices,
              format: exportOptions.jsonFormat,
              includeLineItems: exportOptions.includeLineItems,
              minifyOutput: exportOptions.minifyOutput,
            });
            break;
          case 'csv':
            response = await api.export.generateCSV({
              invoiceIds: selectedInvoices,
              includeHeaders: exportOptions.includeHeaders,
              includeLineItems: exportOptions.includeLineItems,
              dateFormat: exportOptions.dateFormat,
            });
            break;
        }

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const contentDisposition = response.headers.get('content-disposition');
          const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
            : `invoices-export.${exportType === 'json' ? 'json' : exportType}`;
          
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          throw new Error(`Export failed: ${response.statusText}`);
        }
      } else {
        // Batch export for large batches
        const jobResponse = await api.export.startBatchExport({
          exportType,
          invoiceIds: selectedInvoices,
          options: exportOptions,
          notifyOnComplete: true,
        });

        // Add to active jobs and start polling
        const newJob: ExportJob = {
          id: jobResponse.jobId,
          type: exportType,
          status: 'queued',
          progress: 0,
          totalItems: selectedInvoices.length,
          processedItems: 0,
          elapsedTime: 0,
        };
        
        setActiveJobs(prev => [...prev, newJob]);
        startJobPolling(jobResponse.jobId);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      setError(error.message || 'Export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startJobPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const jobStatus = await api.export.getJobStatus(jobId);
        
        setActiveJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...jobStatus } : job
        ));

        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
        clearInterval(interval);
      }
    }, 2000);

    // Cleanup after 1 hour
    setTimeout(() => clearInterval(interval), 60 * 60 * 1000);
  };

  const removeJob = (jobId: string) => {
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
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
                  <p>Complete your organization setup before exporting invoices.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Export Invoices</h1>
              <p className="mt-2 text-gray-600">
                Export invoices in various formats with Malaysian compliance
              </p>
            </div>
            <button
              onClick={() => router.push('/invoices')}
              className="btn-secondary"
            >
              Back to Invoices
            </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Export Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Settings</h3>
              
              {/* Export Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'pdf', label: 'PDF Document', icon: DocumentIcon, desc: 'Professional printable format' },
                    { value: 'json', label: 'JSON Data', icon: DocumentTextIcon, desc: 'MyInvois compatible format' },
                    { value: 'csv', label: 'CSV Spreadsheet', icon: TableCellsIcon, desc: 'Excel-compatible format' },
                  ].map((type) => (
                    <label key={type.value} className="flex items-start">
                      <input
                        type="radio"
                        name="exportType"
                        value={type.value}
                        checked={exportType === type.value}
                        onChange={(e) => setExportType(e.target.value as any)}
                        className="mt-1 rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <div className="flex items-center">
                          <type.icon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{type.label}</span>
                        </div>
                        <span className="text-xs text-gray-500">{type.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Format-specific options */}
              {exportType === 'pdf' && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeQrCode}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeQrCode: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include QR Code</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeWatermark}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeWatermark: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include Watermark</span>
                    </label>
                  </div>
                  {exportOptions.includeWatermark && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Watermark Text
                      </label>
                      <input
                        type="text"
                        value={exportOptions.watermarkText}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, watermarkText: e.target.value }))}
                        className="input text-sm"
                        placeholder="DRAFT - FOR REVIEW ONLY"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page Format
                    </label>
                    <select
                      value={exportOptions.format}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                      className="input text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                    </select>
                  </div>
                </div>
              )}

              {exportType === 'json' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      JSON Format
                    </label>
                    <select
                      value={exportOptions.jsonFormat}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, jsonFormat: e.target.value as any }))}
                      className="input text-sm"
                    >
                      <option value="myinvois">MyInvois Compatible</option>
                      <option value="standard">Standard Format</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeLineItems}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeLineItems: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include Line Items</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.minifyOutput}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, minifyOutput: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Minify Output</span>
                    </label>
                  </div>
                </div>
              )}

              {exportType === 'csv' && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeHeaders}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include Headers</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select
                      value={exportOptions.dateFormat}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, dateFormat: e.target.value as any }))}
                      className="input text-sm"
                    >
                      <option value="ISO">ISO (YYYY-MM-DD)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isLoading || selectedInvoices.length === 0}
                className="w-full btn-primary mt-6 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                )}
                {isLoading ? 'Exporting...' : `Export ${selectedInvoices.length} Invoice${selectedInvoices.length !== 1 ? 's' : ''}`}
              </button>
            </div>

            {/* Active Export Jobs */}
            {activeJobs.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Jobs</h3>
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {job.status === 'completed' ? (
                            <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
                          ) : job.status === 'failed' ? (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                          ) : (
                            <ClockIcon className="h-4 w-4 text-blue-500 mr-2" />
                          )}
                          <span className="text-sm font-medium">{job.type.toUpperCase()} Export</span>
                        </div>
                        <button
                          onClick={() => removeJob(job.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {job.processedItems} / {job.totalItems} items
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      {job.status === 'completed' && job.downloadUrl && (
                        <a
                          href={job.downloadUrl}
                          className="text-xs text-primary-600 hover:text-primary-700 mt-2 inline-block"
                        >
                          Download File
                        </a>
                      )}
                      {job.status === 'failed' && (
                        <div className="text-xs text-red-600 mt-2">{job.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invoice Selection */}
          <div className="lg:col-span-3">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Select Invoices</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {selectedInvoices.length} of {invoices.length} selected
                    </span>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {isLoadingInvoices ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading invoices...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center">
                    <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first invoice.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => router.push('/invoices/create')}
                        className="btn-primary"
                      >
                        Create Invoice
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Buyer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr 
                          key={invoice.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedInvoices.includes(invoice.id) ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => handleSelectInvoice(invoice.id)}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => handleSelectInvoice(invoice.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.issueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.buyerName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.currency} {parseFloat(invoice.grandTotal).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'validated' 
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'draft'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExportInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ExportInvoicesPageContent />
    </Suspense>
  );
}