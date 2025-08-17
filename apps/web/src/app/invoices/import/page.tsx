'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { ArrowUpTrayIcon, DocumentArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface CSVParseResult {
  headers: string[];
  dataRows: string[][];
  totalRows: number;
  suggestedMappings: Record<string, number>;
  timestamp: string;
}

interface ImportResult {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    data: string[];
  }>;
  warnings: Array<{
    row: number;
    message: string;
    validationScore: number;
  }>;
  invoices: Array<{
    row: number;
    invoiceId?: string;
    invoiceNumber: string;
    validationScore: number;
  }>;
  validateOnly: boolean;
  timestamp: string;
}

const COLUMN_MAPPINGS = {
  invoiceNumber: 'Invoice Number *',
  issueDate: 'Issue Date *',
  dueDate: 'Due Date',
  currency: 'Currency',
  exchangeRate: 'Exchange Rate',
  buyerName: 'Buyer Name',
  buyerTin: 'Buyer TIN',
  itemDescription: 'Item Description *',
  quantity: 'Quantity *',
  unitPrice: 'Unit Price *',
  discountAmount: 'Discount Amount',
  sstRate: 'SST Rate (%)',
  notes: 'Notes',
};

export default function ImportInvoicesPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [hasHeaders, setHasHeaders] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete' | 'processing'>('upload');
  const [importId, setImportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    successful: number;
    failed: number;
    status: string;
    elapsedTime?: number;
    estimatedTimeRemaining?: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file (.csv extension required)');
      return;
    }

    // File size validation (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size too large. Please select a CSV file smaller than 10MB.');
      return;
    }

    // Row count estimation
    const estimatedRows = Math.ceil(file.size / 100); // Rough estimate
    if (estimatedRows > 10000) {
      if (!window.confirm(
        `This file appears to contain approximately ${estimatedRows.toLocaleString()} rows. ` +
        `Large files may take several minutes to process. Do you want to continue?`
      )) {
        return;
      }
    }

    setCsvFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Additional content validation
      if (!content.trim()) {
        setError('CSV file appears to be empty');
        return;
      }

      // Check for obvious format issues
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setError('CSV file must contain at least a header row and one data row');
        return;
      }

      setCsvData(content);
      handleParseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleParseCSV = async (csvContent: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.import.parseCSV(csvContent);
      setParseResult(result);
      setColumnMapping(result.suggestedMappings);
      setStep('mapping');
    } catch (error: any) {
      console.error('CSV parsing failed:', error);
      setError(error.message || 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnMappingChange = (field: string, columnIndex: string) => {
    const index = columnIndex === '' ? -1 : parseInt(columnIndex);
    setColumnMapping(prev => ({
      ...prev,
      [field]: index,
    }));
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.import.importInvoices({
        csvData,
        columnMapping,
        hasHeaders,
        validateOnly: true,
      });
      setImportResult(result);
      setStep('preview');
    } catch (error: any) {
      console.error('Import preview failed:', error);
      setError(error.message || 'Failed to preview import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check if this is a large file that needs chunked processing
      const rows = csvData.split('\n').filter(line => line.trim());
      const dataRowCount = hasHeaders ? rows.length - 1 : rows.length;
      
      if (dataRowCount > 50) {
        // Use chunked import for large files
        const result = await api.import.startChunkedImport({
          csvData,
          columnMapping,
          hasHeaders,
          validateOnly: false,
          batchSize: 100,
        });
        
        setImportId(result.importId);
        setStep('processing');
        startProgressTracking(result.importId);
      } else {
        // Use regular import for small files
        const result = await api.import.importInvoices({
          csvData,
          columnMapping,
          hasHeaders,
          validateOnly: false,
        });
        setImportResult(result);
        setStep('complete');
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      setError(error.message || 'Failed to import invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const startProgressTracking = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const progressData = await api.import.getProgress(id);
        setProgress(progressData);
        
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(interval);
          if (progressData.status === 'completed') {
            setImportResult({
              total: progressData.total,
              processed: progressData.processed,
              successful: progressData.successful,
              failed: progressData.failed,
              errors: progressData.errors,
              warnings: progressData.warnings,
              invoices: [],
              validateOnly: false,
              timestamp: new Date().toISOString(),
            });
            setStep('complete');
          } else {
            setError('Import failed during processing');
          }
        }
      } catch (error: any) {
        console.error('Failed to get progress:', error);
        clearInterval(interval);
        setError('Failed to track import progress');
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 30 * 60 * 1000);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import/template`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      setError(error.message || 'Failed to download template');
    }
  };

  const resetImport = () => {
    setCsvFile(null);
    setCsvData('');
    setParseResult(null);
    setColumnMapping({});
    setImportResult(null);
    setImportId(null);
    setProgress(null);
    setStep('upload');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                  <p>Complete your organization setup before importing invoices.</p>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Invoices</h1>
              <p className="mt-2 text-gray-600">
                Import invoices from CSV with Malaysian compliance validation
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadTemplate}
                className="btn-secondary flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Download Template
              </button>
              <button
                onClick={() => router.push('/invoices')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {[
                { id: 'upload', name: 'Upload CSV', status: step === 'upload' ? 'current' : ['mapping', 'preview', 'processing', 'complete'].includes(step) ? 'complete' : 'upcoming' },
                { id: 'mapping', name: 'Map Columns', status: step === 'mapping' ? 'current' : ['preview', 'processing', 'complete'].includes(step) ? 'complete' : 'upcoming' },
                { id: 'preview', name: 'Preview & Validate', status: step === 'preview' ? 'current' : ['processing', 'complete'].includes(step) ? 'complete' : 'upcoming' },
                { id: 'processing', name: 'Processing', status: step === 'processing' ? 'current' : step === 'complete' ? 'complete' : 'upcoming' },
                { id: 'complete', name: 'Import Complete', status: step === 'complete' ? 'current' : 'upcoming' },
              ].map((stepItem, stepIdx) => (
                <li key={stepItem.id} className={stepIdx !== 4 ? 'pr-8 sm:pr-20' : ''}>
                  <div className="relative">
                    {stepItem.status === 'complete' ? (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-primary-600" />
                      </div>
                    ) : stepItem.status === 'current' ? (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                    )}
                    <div className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                      stepItem.status === 'complete' 
                        ? 'bg-primary-600' 
                        : stepItem.status === 'current' 
                        ? 'bg-primary-600' 
                        : 'bg-white border-2 border-gray-300'
                    }`}>
                      {stepItem.status === 'complete' ? (
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                      ) : (
                        <span className={`text-sm font-medium ${
                          stepItem.status === 'current' ? 'text-white' : 'text-gray-500'
                        }`}>
                          {stepIdx + 1}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium ${
                        stepItem.status === 'current' ? 'text-primary-600' : 'text-gray-500'
                      }`}>
                        {stepItem.name}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
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

        {/* Step Content */}
        <div className="bg-white shadow-sm rounded-lg">
          {step === 'upload' && (
            <div className="p-6">
              <div className="text-center">
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload CSV File</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a CSV file containing invoice data to import
                </p>
                <div className="mt-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Parsing...' : 'Select CSV File'}
                  </button>
                </div>
                {csvFile && (
                  <div className="mt-4 text-sm text-gray-600">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'mapping' && parseResult && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Map CSV Columns</h3>
              <p className="text-sm text-gray-600 mb-6">
                Map your CSV columns to invoice fields. Required fields are marked with *.
              </p>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">First row contains headers</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Object.entries(COLUMN_MAPPINGS).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <select
                      value={columnMapping[field] ?? ''}
                      onChange={(e) => handleColumnMappingChange(field, e.target.value)}
                      className="input w-full"
                    >
                      <option value="">-- Select Column --</option>
                      {parseResult.headers.map((header, index) => (
                        <option key={index} value={index}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {parseResult.dataRows.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Data Preview</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {parseResult.headers.map((header, index) => (
                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Column {index + 1}: {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.dataRows.slice(0, 3).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t border-gray-200">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Showing first 3 rows of {parseResult.totalRows} total rows
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button onClick={resetImport} className="btn-secondary">
                  Start Over
                </button>
                <button
                  onClick={handlePreview}
                  disabled={isLoading || !columnMapping.invoiceNumber || !columnMapping.issueDate || !columnMapping.itemDescription || !columnMapping.quantity || !columnMapping.unitPrice}
                  className="btn-primary"
                >
                  {isLoading ? 'Validating...' : 'Preview Import'}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && importResult && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Preview</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                  <div className="text-sm text-blue-600">Total Rows</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                  <div className="text-sm text-green-600">Valid Invoices</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-sm text-red-600">Failed Rows</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
                  <div className="text-sm text-yellow-600">Warnings</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-48 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-1">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings ({importResult.warnings.length})</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-h-48 overflow-y-auto">
                    {importResult.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700 mb-1 border-b border-yellow-200 pb-1">
                        <div className="font-medium">Row {warning.row}</div>
                        <div>{warning.message}</div>
                        <div className="text-xs text-yellow-600">Validation Score: {warning.validationScore}/100</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample data preview */}
              {importResult.successful > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Preview of Valid Data</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="text-xs text-gray-600 mb-2">
                      Showing sample of validated invoice data that will be imported:
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="text-xs">
                        <span className="font-medium">Invoice Format:</span> Malaysian e-Invoice compliant
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">SST Calculation:</span> Automatic 6% where applicable
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Currency Support:</span> MYR with proper exchange rates
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Validation Level:</span> LHDN compliance checked
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep('mapping')} className="btn-secondary">
                  Back to Mapping
                </button>
                <div className="space-x-4">
                  <button onClick={resetImport} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(
                        `Are you sure you want to import ${importResult.successful} invoices?\n\n` +
                        `This will create ${importResult.successful} new invoice records in your system. ` +
                        `${importResult.failed > 0 ? `${importResult.failed} rows with errors will be skipped. ` : ''}` +
                        `${importResult.warnings.length > 0 ? `${importResult.warnings.length} invoices have validation warnings but will still be imported. ` : ''}` +
                        `\nThis action cannot be undone.`
                      )) {
                        handleImport();
                      }
                    }}
                    disabled={isLoading || importResult.successful === 0}
                    className="btn-primary"
                  >
                    {isLoading ? 'Importing...' : `Import ${importResult.successful} Invoices`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && progress && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Import</h3>
              <p className="text-sm text-gray-600 mb-6">
                Please wait while we process your CSV file. This may take a few minutes for large files.
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress: {progress.processed} / {progress.total}</span>
                  <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{progress.successful}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{progress.total - progress.processed}</div>
                  <div className="text-sm text-blue-600">Remaining</div>
                </div>
              </div>

              {/* Time Information */}
              {progress.elapsedTime && (
                <div className="text-sm text-gray-600 mb-4">
                  <div>Elapsed: {Math.floor(progress.elapsedTime / 1000)}s</div>
                  {progress.estimatedTimeRemaining && (
                    <div>Estimated remaining: {Math.floor(progress.estimatedTimeRemaining / 1000)}s</div>
                  )}
                </div>
              )}

              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="p-6 text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Import Complete!</h3>
              <p className="mt-1 text-sm text-gray-500">
                Successfully imported {importResult.successful} out of {importResult.total} invoices
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                  <div className="text-sm text-green-600">Successfully Imported</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
                  <div className="text-sm text-yellow-600">With Warnings</div>
                </div>
              </div>

              <div className="mt-8 flex justify-center space-x-4">
                <button onClick={() => router.push('/invoices')} className="btn-primary">
                  View Invoices
                </button>
                <button onClick={resetImport} className="btn-secondary">
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}