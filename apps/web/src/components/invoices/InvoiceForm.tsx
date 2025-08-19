'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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
} from '@einvoice/validation';

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

  // Calculate line totals and invoice totals using validation package functions
  const calculateTotals = useCallback(() => {
    if (!watchedFields.lineItems) return;

    let subtotal = 0;
    let totalSst = 0;
    let totalDiscount = 0;

    watchedFields.lineItems.forEach((item, index) => {
      const quantity = parseFloat(item.quantity || '0');
      const unitPrice = parseFloat(item.unitPrice || '0');
      const discount = parseFloat(item.discountAmount || '0');
      const sstRate = parseFloat(item.sstRate || '0');

      // Use validation package calculation functions
      const lineTotal = calculateLineTotal(quantity, unitPrice, discount);
      const sstAmount = calculateSstAmount(lineTotal, sstRate);

      // Update calculated fields in form
      setValue(`lineItems.${index}.lineTotal`, lineTotal.toFixed(2));
      setValue(`lineItems.${index}.sstAmount`, sstAmount.toFixed(2));

      // Accumulate totals
      subtotal += lineTotal;
      totalSst += sstAmount;
      totalDiscount += discount;
    });

    // Calculate grand total
    const grandTotal = calculateGrandTotal(subtotal, 0, totalSst); // No additional discount at invoice level
    
    // Update invoice totals in form
    setValue('invoice.subtotal', subtotal.toFixed(2));
    setValue('invoice.sstAmount', totalSst.toFixed(2));
    setValue('invoice.totalDiscount', totalDiscount.toFixed(2));
    setValue('invoice.grandTotal', grandTotal.toFixed(2));

    setTotals({
      subtotal,
      totalDiscount,
      totalSst,
      grandTotal,
    });
  }, [watchedFields.lineItems, setValue]);

  // Recalculate totals when line items change
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const addLineItem = () => {
    append({
      itemDescription: '',
      quantity: '1',
      unitPrice: '0.00',
      discountAmount: '0.00',
      lineTotal: '0.00',
      sstRate: '0.00',
      sstAmount: '0.00',
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handleValidate = () => {
    if (onValidate && isValid) {
      onValidate(watchedFields as FormData);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Buyer Information */}
      {!watchedFields.invoice?.isConsolidated && (
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
              <div className="mt-4 bg-gray-50 p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Line Total: </span>
                    <span className="font-medium">
                      {watchedFields.lineItems?.[index]?.lineTotal || '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">SST Amount: </span>
                    <span className="font-medium">
                      {watchedFields.lineItems?.[index]?.sstAmount || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Totals */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Invoice Totals</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">RM {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Discount:</span>
            <span className="font-medium">RM {totals.totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">SST (6%):</span>
            <span className="font-medium">RM {totals.totalSst.toFixed(2)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Grand Total:</span>
              <span>RM {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

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