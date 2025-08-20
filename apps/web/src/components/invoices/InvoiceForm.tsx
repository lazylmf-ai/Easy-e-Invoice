'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ErrorBoundary, withErrorBoundary } from '@/components/error/ErrorBoundary';
import { FinancialErrorBoundary } from '@/components/error/FinancialErrorBoundary';

// Custom debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: false, trailing: true }
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  
  const debounced = (...args: Parameters<T>) => {
    const now = Date.now();
    
    const callNow = options.leading && (now - lastCallTime > delay);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (callNow) {
      lastCallTime = now;
      func(...args);
    } else if (options.trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func(...args);
        timeoutId = null;
      }, delay);
    }
  };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced as T & { cancel: () => void };
}
import { 
  invoiceCreateSchema, 
  lineItemCreateSchema,
  SUPPORTED_CURRENCIES,
  E_INVOICE_TYPES,
  calculateLineTotal,
  calculateSstAmount,
  calculateGrandTotal,
  type InvoiceCreate,
  type LineItemCreate
} from '@/lib/validation-schemas';

// Form schema combining invoice and line items
const formSchema = z.object({
  invoice: invoiceCreateSchema,
  lineItems: z.array(lineItemCreateSchema).min(1, 'At least one line item is required'),
  buyerId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Enhanced currency data with symbols
const CURRENCY_DATA = SUPPORTED_CURRENCIES.map(code => {
  const symbols: Record<string, string> = {
    'MYR': 'RM',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'SGD': 'S$',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF'
  };
  
  const names: Record<string, string> = {
    'MYR': 'Malaysian Ringgit',
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'SGD': 'Singapore Dollar',
    'JPY': 'Japanese Yen',
    'CNY': 'Chinese Yuan',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CHF': 'Swiss Franc'
  };
  
  return {
    code,
    name: names[code] || code,
    symbol: symbols[code] || code
  };
});

const INVOICE_TYPE_DATA = Object.entries(E_INVOICE_TYPES).map(([value, label]) => ({
  value,
  label
}));

interface InvoiceFormProps {
  initialData?: Partial<FormData>;
  templateData?: any;
  onSubmit: (data: FormData) => void;
  onValidate?: (data: FormData) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export default function InvoiceForm({
  initialData,
  templateData,
  onSubmit,
  onValidate,
  isLoading = false,
  mode = 'create'
}: InvoiceFormProps) {
  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalSst: 0,
    grandTotal: 0,
  });
  
  const [isCalculating, setIsCalculating] = useState(false);
  const calculationInProgress = useRef(false);
  const calculationVersion = useRef(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: templateData || initialData || {
      invoice: {
        invoiceNumber: '',
        currency: 'MYR',
        exchangeRate: '1.000000',
        eInvoiceType: '01',
        isConsolidated: false,
        issueDate: new Date().toISOString().split('T')[0],
        subtotal: '0.00',
        sstAmount: '0.00',
        totalDiscount: '0.00',
        grandTotal: '0.00',
        status: 'draft',
      },
      lineItems: [{
        itemDescription: '',
        quantity: '1',
        unitPrice: '0.00',
        discountAmount: '0.00',
        lineTotal: '0.00',
        sstRate: '0.00',
        sstAmount: '0.00',
      }],
    },
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  });

  const watchedFields = watch();

  // Safe number parsing with fallback
  const safeParseFloat = useCallback((value: string | number | undefined, fallback: number = 0): number => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? fallback : parsed;
  }, []);

  // Calculate line totals and invoice totals with race condition protection
  const calculateTotals = useCallback(async () => {
    if (!watchedFields.lineItems || calculationInProgress.current) return;
    
    // Prevent concurrent calculations
    calculationInProgress.current = true;
    setIsCalculating(true);
    
    // Get current calculation version
    const currentVersion = ++calculationVersion.current;
    
    try {
      // Validate all line items have required fields
      const validLineItems = watchedFields.lineItems.filter(item => 
        item.quantity && item.unitPrice && item.itemDescription
      );
      
      if (validLineItems.length === 0) {
        setTotals({ subtotal: 0, totalDiscount: 0, totalSst: 0, grandTotal: 0 });
        return;
      }

      let subtotal = 0;
      let totalSst = 0;
      let totalDiscount = 0;
      const updatedLineItems: Array<{ index: number; sstAmount: string; lineTotal: string }> = [];

      // Process line items sequentially to avoid race conditions
      for (let index = 0; index < watchedFields.lineItems.length; index++) {
        const item = watchedFields.lineItems[index];
        
        // Check if calculation was superseded
        if (calculationVersion.current !== currentVersion) {
          return; // Abort this calculation
        }
        
        const quantity = safeParseFloat(item.quantity);
        const unitPrice = safeParseFloat(item.unitPrice);
        const discount = safeParseFloat(item.discountAmount);
        const sstRate = safeParseFloat(item.sstRate);

        // Skip invalid line items
        if (quantity <= 0 || unitPrice < 0) continue;

        try {
          // Use validation package calculation functions with proper error handling
          const lineTotal = parseFloat(calculateLineTotal(
            quantity.toString(), 
            unitPrice.toString(), 
            discount.toString()
          ));
          
          const sstAmount = parseFloat(calculateSstAmount(lineTotal.toFixed(2), sstRate));

          // Validate calculation results
          if (isNaN(lineTotal) || isNaN(sstAmount) || lineTotal < 0 || sstAmount < 0) {
            console.warn(`Invalid calculation for line item ${index}:`, { lineTotal, sstAmount });
            continue;
          }

          // Store updates for batch application
          updatedLineItems.push({
            index,
            sstAmount: sstAmount.toFixed(2),
            lineTotal: lineTotal.toFixed(2)
          });

          // Accumulate totals
          subtotal += lineTotal;
          totalSst += sstAmount;
          totalDiscount += discount;
        } catch (error) {
          console.error(`Calculation error for line item ${index}:`, error);
          continue;
        }
      }

      // Final validation check before applying updates
      if (calculationVersion.current !== currentVersion) {
        return; // Abort if superseded
      }

      // Apply all form updates in a single batch to prevent race conditions
      updatedLineItems.forEach(({ index, sstAmount, lineTotal }) => {
        setValue(`lineItems.${index}.sstAmount`, sstAmount, { shouldDirty: false });
        setValue(`lineItems.${index}.lineTotal`, lineTotal, { shouldDirty: false });
      });

      // Calculate grand total with proper precision handling
      const grandTotal = subtotal - totalDiscount + totalSst;
      
      // Round to avoid floating-point precision issues
      const finalTotals = {
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalSst: Math.round(totalSst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };

      // Final check before setting state
      if (calculationVersion.current === currentVersion) {
        setTotals(finalTotals);
      }
    } catch (error) {
      console.error('Error in calculateTotals:', error);
      // Reset to safe state on error
      setTotals({ subtotal: 0, totalDiscount: 0, totalSst: 0, grandTotal: 0 });
    } finally {
      calculationInProgress.current = false;
      setIsCalculating(false);
    }
  }, [watchedFields.lineItems, setValue, safeParseFloat]);

  // Debounced calculation to prevent excessive recalculations
  const debouncedCalculateTotals = useMemo(
    () => debounce(calculateTotals, 300, { leading: false, trailing: true }),
    [calculateTotals]
  );

  // Recalculate totals when line items change (debounced)
  useEffect(() => {
    debouncedCalculateTotals();
    
    // Cleanup debounced function
    return () => {
      debouncedCalculateTotals.cancel();
    };
  }, [debouncedCalculateTotals]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCalculateTotals.cancel();
      calculationInProgress.current = false;
    };
  }, [debouncedCalculateTotals]);

  const addLineItem = () => {
    try {
      append({
        itemDescription: '',
        quantity: '1',
        unitPrice: '0.00',
        discountAmount: '0.00',
        sstRate: '0.00',
        sstAmount: '0.00',
      });
    } catch (error) {
      console.error('Failed to add line item:', error);
      throw new Error('Failed to add new line item');
    }
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleFormSubmit = (data: FormData) => {
    try {
      // Validate critical data before submission
      if (!data.invoice?.invoiceNumber) {
        throw new Error('Invoice number is required');
      }
      if (!data.lineItems || data.lineItems.length === 0) {
        throw new Error('At least one line item is required');
      }
      
      // Check for Malaysian e-Invoice compliance
      if (data.invoice.currency !== 'MYR' && !data.invoice.exchangeRate) {
        throw new Error('Exchange rate is required for non-MYR currencies');
      }
      
      onSubmit(data);
    } catch (error) {
      console.error('Form submission validation failed:', error);
      throw error; // Re-throw to be caught by error boundary
    }
  };

  const handleValidate = () => {
    try {
      if (onValidate && isValid) {
        // Pre-validation checks for Malaysian compliance
        const formData = watchedFields as FormData;
        
        // Check TIN format for B2B transactions
        if (formData.invoice?.buyerTin) {
          const tinRegex = /^(C\d{10}|\d{12})$/;
          if (!tinRegex.test(formData.invoice.buyerTin)) {
            throw new Error('Invalid Malaysian TIN format. Use C1234567890 or 123456789012');
          }
        }
        
        // Validate SST calculations
        const hasInvalidSST = formData.lineItems?.some(item => {
          const sstRate = parseFloat(String(item.sstRate || '0'));
          return sstRate < 0 || sstRate > 10;
        });
        
        if (hasInvalidSST) {
          throw new Error('Invalid SST rate. Malaysian SST rate should be 0%, 6%, or 10%');
        }
        
        onValidate(formData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      throw error; // Re-throw to be caught by error boundary
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Buyer Information */}
      {(
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Buyer Information</h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Buyer Name *
              </label>
              <input
                type="text"
                {...register('invoice.buyerName')}
                className="input mt-1"
                placeholder="Customer/Buyer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Buyer TIN
              </label>
              <input
                type="text"
                {...register('invoice.buyerTin')}
                className="input mt-1"
                placeholder="C1234567890 or 123456789012"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for B2B transactions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                {...register('invoice.buyerEmail')}
                className="input mt-1"
                placeholder="buyer@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                {...register('invoice.buyerPhone')}
                className="input mt-1"
                placeholder="+60123456789"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                {...register('invoice.buyerAddress')}
                rows={2}
                className="input mt-1"
                placeholder="Complete buyer address"
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Invoice Information</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number *
            </label>
            <input
              type="text"
              {...register('invoice.invoiceNumber')}
              className={`input mt-1 ${errors.invoice?.invoiceNumber ? 'border-red-300' : ''}`}
              placeholder="INV-2024-001"
            />
            {errors.invoice?.invoiceNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.invoice.invoiceNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Type *
            </label>
            <select
              {...register('invoice.eInvoiceType')}
              className="input mt-1"
            >
              {INVOICE_TYPE_DATA.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Issue Date *
            </label>
            <input
              type="date"
              {...register('invoice.issueDate')}
              className={`input mt-1 ${errors.invoice?.issueDate ? 'border-red-300' : ''}`}
            />
            {errors.invoice?.issueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.invoice.issueDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              {...register('invoice.dueDate')}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency *
            </label>
            <select
              {...register('invoice.currency')}
              className="input mt-1"
            >
              {CURRENCY_DATA.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          {watchedFields.invoice?.currency !== 'MYR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Exchange Rate *
              </label>
              <input
                type="number"
                step="0.000001"
                {...register('invoice.exchangeRate')}
                className="input mt-1"
                placeholder="1.000000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Rate from Bank Negara Malaysia
              </p>
            </div>
          )}
        </div>

        {/* Consolidation and References */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('invoice.isConsolidated')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              This is a consolidated B2C invoice
            </label>
          </div>

          {watchedFields.invoice?.isConsolidated && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Consolidation Period
                </label>
                <input
                  type="month"
                  {...register('invoice.metadata.consolidationPeriod')}
                  className="input mt-1"
                />
              </div>
            </div>
          )}

          {['02', '03'].includes(watchedFields.invoice?.eInvoiceType || '') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reference Invoice Number *
              </label>
              <input
                type="text"
                {...register('invoice.referenceInvoiceId')}
                className="input mt-1"
                placeholder="Original invoice ID"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for credit and debit notes
              </p>
            </div>
          )}
        </div>

        {/* Additional Fields */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Internal Reference
            </label>
            <input
              type="text"
              {...register('invoice.internalRef')}
              className="input mt-1"
              placeholder="Internal tracking number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              PO Number
            </label>
            <input
              type="text"
              {...register('invoice.poNumber')}
              className="input mt-1"
              placeholder="Purchase order number"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
          <button
            type="button"
            onClick={addLineItem}
            className="btn-secondary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Item {index + 1}
                </h4>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <input
                    type="text"
                    {...register(`lineItems.${index}.itemDescription`)}
                    className={`input mt-1 ${errors.lineItems?.[index]?.itemDescription ? 'border-red-300' : ''}`}
                    placeholder="Item description"
                  />
                  {errors.lineItems?.[index]?.itemDescription && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.lineItems[index]?.itemDescription?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU/Code
                  </label>
                  <input
                    type="text"
                    {...register(`lineItems.${index}.itemSku`)}
                    className="input mt-1"
                    placeholder="SKU or item code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    {...register(`lineItems.${index}.quantity`)}
                    className={`input mt-1 ${errors.lineItems?.[index]?.quantity ? 'border-red-300' : ''}`}
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.unitPrice`)}
                    className={`input mt-1 ${errors.lineItems?.[index]?.unitPrice ? 'border-red-300' : ''}`}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Discount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.discountAmount`)}
                    className="input mt-1"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SST Rate (%)
                  </label>
                  <select
                    {...register(`lineItems.${index}.sstRate`)}
                    className="input mt-1"
                  >
                    <option value="0.00">0% (No SST)</option>
                    <option value="6.00">6% (Standard SST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Exemption
                  </label>
                  <input
                    type="text"
                    {...register(`lineItems.${index}.taxExemptionCode`)}
                    className="input mt-1"
                    placeholder="Exemption code"
                  />
                </div>
              </div>

              {/* Calculated totals for this line */}
              <FinancialErrorBoundary>
                <div className="mt-4 bg-gray-50 p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Line Total: </span>
                    <span className={`font-medium ${isCalculating ? 'text-gray-400' : ''}`}>
                      {isCalculating ? 'Calculating...' : 
                       `RM ${watchedFields.lineItems?.[index]?.lineTotal || '0.00'}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">SST Amount: </span>
                    <span className={`font-medium ${isCalculating ? 'text-gray-400' : ''}`}>
                      {isCalculating ? 'Calculating...' : 
                       `RM ${watchedFields.lineItems?.[index]?.sstAmount || '0.00'}`}
                    </span>
                  </div>
                </div>
                </div>
              </FinancialErrorBoundary>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Totals */}
      <FinancialErrorBoundary>
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Invoice Totals</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className={`font-medium ${isCalculating ? 'text-gray-400' : ''}`}>
              {isCalculating ? 'Calculating...' : `RM ${totals.subtotal.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Discount:</span>
            <span className={`font-medium ${isCalculating ? 'text-gray-400' : ''}`}>
              {isCalculating ? 'Calculating...' : `RM ${totals.totalDiscount.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">SST (6%):</span>
            <span className={`font-medium ${isCalculating ? 'text-gray-400' : ''}`}>
              {isCalculating ? 'Calculating...' : `RM ${totals.totalSst.toFixed(2)}`}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Grand Total:</span>
              <span className={`${isCalculating ? 'text-gray-400' : ''}`}>
                {isCalculating ? 'Calculating...' : `RM ${totals.grandTotal.toFixed(2)}`}
              </span>
            </div>
          </div>
          {isCalculating && (
            <div className="text-xs text-gray-500 text-center mt-2">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating calculations...
              </div>
            </div>
          )}
        </div>
        </div>
      </FinancialErrorBoundary>

      {/* Notes */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            {...register('invoice.notes')}
            rows={3}
            className="input mt-1"
            placeholder="Additional notes or comments..."
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center">
        <div>
          {onValidate && (
            <button
              type="button"
              onClick={handleValidate}
              disabled={!isValid || isLoading}
              className="btn-secondary mr-4"
            >
              Validate Invoice
            </button>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setValue('invoice.status', 'draft')}
            className="btn-secondary"
          >
            Save as Draft
          </button>
          
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
          </button>
        </div>
      </div>
    </form>
  );
}