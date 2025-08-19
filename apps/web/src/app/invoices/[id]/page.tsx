'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  DocumentDuplicateIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  eInvoiceType: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  sstAmount: string;
  totalDiscount: string;
  grandTotal: string;
  status: string;
  validationScore: number;
  isConsolidated: boolean;
  consolidationPeriod?: string;
  referenceInvoiceId?: string;
  
  // Buyer information
  buyerName?: string;
  buyerTin?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  
  // Additional fields
  poNumber?: string;
  internalRef?: string;
  notes?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastValidatedAt?: string;
  
  // Related data
  lineItems: LineItem[];
  validationResults: ValidationResult[];
  organization: {
    name: string;
    tin: string;
    sstNumber?: string;
  };
}

interface LineItem {
  id: string;
  lineNumber: number;
  itemDescription: string;
  itemSku?: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
  sstRate: string;
  sstAmount: string;
  taxExemptionCode?: string;
}

interface ValidationResult {
  id: string;
  ruleCode: string;
  severity: 'error' | 'warning' | 'info';
  fieldPath?: string;
  message: string;
  fixSuggestion?: string;
  isResolved: boolean;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  validated: 'bg-blue-100 text-blue-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const E_INVOICE_TYPES = {
  '01': 'Invoice',
  '02': 'Credit Note',
  '03': 'Debit Note',
  '04': 'Refund Note',
};

const VALIDATION_SEVERITY_COLORS = {
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
};

const VALIDATION_SEVERITY_ICONS = {
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: CheckCircleIcon,
};

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  useEffect(() => {
    if (!user?.hasCompletedOnboarding) {
      router.push('/org/setup');
      return;
    }

    fetchInvoice();
  }, [invoiceId, user?.hasCompletedOnboarding]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.invoices.get(invoiceId);
      setInvoice(response.invoice);
    } catch (error: any) {
      console.error('Failed to fetch invoice:', error);
      setError(error.message || 'Failed to fetch invoice');
      
      // If invoice not found, redirect to invoice list
      if (error.status === 404) {
        setTimeout(() => router.push('/invoices'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setActionLoading('validate');
      await api.invoices.validate(invoiceId);
      await fetchInvoice(); // Refresh to get updated validation results
    } catch (error: any) {
      console.error('Failed to validate invoice:', error);
      setError(error.message || 'Failed to validate invoice');
    } finally {
      setActionLoading('');
    }
  };

  const handleDuplicate = async () => {
    try {
      setActionLoading('duplicate');
      const response = await api.invoices.duplicate(invoiceId);
      router.push(`/invoices/${response.invoice.id}/edit`);
    } catch (error: any) {
      console.error('Failed to duplicate invoice:', error);
      setError(error.message || 'Failed to duplicate invoice');
    } finally {
      setActionLoading('');
    }
  };

  const handleExportPDF = async () => {
    try {
      setActionLoading('pdf');
      const response = await api.export.pdf(invoiceId);
      
      // Create download link
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Failed to export PDF:', error);
      setError(error.message || 'Failed to export PDF');
    } finally {
      setActionLoading('');
    }
  };

  const getValidationScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getValidationScoreStatus = (score: number) => {
    if (score === 100) return 'Fully Compliant';
    if (score >= 90) return 'Minor Issues';
    if (score >= 70) return 'Significant Issues';
    return 'Major Issues';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/invoices')}
                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100"
                  >
                    Back to Invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/invoices')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {invoice.invoiceNumber}
                  </h1>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS]
                  }`}>
                    {invoice.status}
                  </span>
                  {invoice.isConsolidated && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      B2C Consolidated
                    </span>
                  )}
                </div>
                <p className="mt-2 text-gray-600">
                  {E_INVOICE_TYPES[invoice.eInvoiceType as keyof typeof E_INVOICE_TYPES]} • 
                  Issued: {new Date(invoice.issueDate).toLocaleDateString()}
                  {invoice.dueDate && ` • Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleValidate}
                disabled={actionLoading === 'validate'}
                className="btn-secondary flex items-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {actionLoading === 'validate' ? 'Validating...' : 'Validate'}
              </button>
              
              <button
                onClick={handleExportPDF}
                disabled={actionLoading === 'pdf'}
                className="btn-secondary flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                {actionLoading === 'pdf' ? 'Exporting...' : 'Export PDF'}
              </button>
              
              <button
                onClick={handleDuplicate}
                disabled={actionLoading === 'duplicate'}
                className="btn-secondary flex items-center"
              >
                <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                {actionLoading === 'duplicate' ? 'Duplicating...' : 'Duplicate'}
              </button>

              {['draft', 'validated'].includes(invoice.status) && (
                <button
                  onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                  className="btn-primary flex items-center"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Invoice Details */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                  <p className="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {E_INVOICE_TYPES[invoice.eInvoiceType as keyof typeof E_INVOICE_TYPES]}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                
                {invoice.dueDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {invoice.currency}
                    {invoice.currency !== 'MYR' && ` (Rate: ${invoice.exchangeRate})`}
                  </p>
                </div>
                
                {invoice.poNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Number</label>
                    <p className="mt-1 text-sm text-gray-900">{invoice.poNumber}</p>
                  </div>
                )}
                
                {invoice.internalRef && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Internal Reference</label>
                    <p className="mt-1 text-sm text-gray-900">{invoice.internalRef}</p>
                  </div>
                )}
              </div>
              
              {invoice.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Buyer Information */}
            {(invoice.buyerName || !invoice.isConsolidated) && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Buyer Information</h3>
                
                {invoice.buyerName ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{invoice.buyerName}</p>
                    </div>
                    
                    {invoice.buyerTin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">TIN</label>
                        <p className="mt-1 text-sm text-gray-900">{invoice.buyerTin}</p>
                      </div>
                    )}
                    
                    {invoice.buyerEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{invoice.buyerEmail}</p>
                      </div>
                    )}
                    
                    {invoice.buyerPhone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{invoice.buyerPhone}</p>
                      </div>
                    )}
                    
                    {invoice.buyerAddress && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{invoice.buyerAddress}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No buyer information (B2C consolidated invoice)
                  </p>
                )}
              </div>
            )}

            {/* Line Items */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SST
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.itemDescription}
                            </div>
                            {item.itemSku && (
                              <div className="text-sm text-gray-500">SKU: {item.itemSku}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {parseFloat(item.quantity).toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.currency} {parseFloat(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {parseFloat(item.discountAmount) > 0 ? 
                            `${invoice.currency} ${parseFloat(item.discountAmount).toFixed(2)}` : 
                            '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {parseFloat(item.sstRate)}% 
                          {parseFloat(item.sstAmount) > 0 && 
                            ` (${invoice.currency} ${parseFloat(item.sstAmount).toFixed(2)})`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {invoice.currency} {parseFloat(item.lineTotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Totals</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>
                
                {parseFloat(invoice.totalDiscount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium">-{invoice.currency} {parseFloat(invoice.totalDiscount).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">SST (6%):</span>
                  <span className="font-medium">{invoice.currency} {parseFloat(invoice.sstAmount).toFixed(2)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Grand Total:</span>
                    <span>{invoice.currency} {parseFloat(invoice.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Validation Status */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Status</h3>
              
              <div className="text-center mb-4">
                <div className={`text-3xl font-bold ${getValidationScoreColor(invoice.validationScore)}`}>
                  {invoice.validationScore}/100
                </div>
                <div className="text-sm text-gray-600">
                  {getValidationScoreStatus(invoice.validationScore)}
                </div>
                {invoice.lastValidatedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last validated: {new Date(invoice.lastValidatedAt).toLocaleString()}
                  </div>
                )}
              </div>
              
              {invoice.validationResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Issues Found:</h4>
                  {invoice.validationResults.map((result) => {
                    const IconComponent = VALIDATION_SEVERITY_ICONS[result.severity];
                    return (
                      <div 
                        key={result.id}
                        className={`p-3 rounded-md border ${VALIDATION_SEVERITY_COLORS[result.severity]}`}
                      >
                        <div className="flex">
                          <IconComponent className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{result.message}</p>
                            {result.fieldPath && (
                              <p className="text-xs opacity-75">Field: {result.fieldPath}</p>
                            )}
                            {result.fixSuggestion && (
                              <p className="text-xs mt-1 opacity-75">
                                Suggestion: {result.fixSuggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Organization Info */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <p className="mt-1 text-sm text-gray-900">{invoice.organization.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">TIN</label>
                  <p className="mt-1 text-sm text-gray-900">{invoice.organization.tin}</p>
                </div>
                
                {invoice.organization.sstNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SST Number</label>
                    <p className="mt-1 text-sm text-gray-900">{invoice.organization.sstNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Preview
                </button>
                
                <button
                  onClick={() => navigator.share?.({ 
                    title: `Invoice ${invoice.invoiceNumber}`,
                    text: `Invoice ${invoice.invoiceNumber} - ${invoice.currency} ${parseFloat(invoice.grandTotal).toFixed(2)}`,
                    url: window.location.href 
                  })}
                  className="w-full btn-secondary"
                >
                  Share Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}