import { z } from 'zod';

/**
 * Malaysian e-Invoice validation schemas
 * Based on LHDN e-Invoice Technical Specifications
 */

// Currency codes supported in Malaysia
export const SUPPORTED_CURRENCIES = [
  'MYR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF'
] as const;

// e-Invoice document types
export const E_INVOICE_TYPES = {
  '01': 'Invoice',
  '02': 'Credit Note', 
  '03': 'Debit Note',
  '04': 'Refund Note'
} as const;

// Invoice status
export const INVOICE_STATUS = [
  'draft', 'validated', 'submitted', 'approved', 'rejected', 'cancelled'
] as const;

// Malaysian states for address validation
export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
] as const;

// Decimal string validation for monetary amounts
const decimalString = z.string().regex(
  /^\d+(\.\d{1,2})?$/,
  'Must be a valid decimal with up to 2 decimal places'
);

// Positive decimal string
const positiveDecimalString = z.string().regex(
  /^[1-9]\d*(\.\d{1,2})?$|^0\.\d*[1-9]\d*$/,
  'Must be a positive decimal'
);

// Malaysian postcode validation
const malaysianPostcode = z.string().regex(
  /^\d{5}$/,
  'Malaysian postcode must be 5 digits'
);

// Phone number validation (Malaysian format)
const malaysianPhone = z.string().regex(
  /^(\+?6?0?1[0-46-9]-*\d{7,8})|(\+?6?0?[4-9]-*\d{7,8})$/,
  'Invalid Malaysian phone number format'
).optional();

// Email validation
const emailSchema = z.string().email('Invalid email format');

// Address schema
export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(50),
  state: z.enum(MALAYSIAN_STATES, {
    errorMap: () => ({ message: 'Must be a valid Malaysian state' })
  }),
  postcode: malaysianPostcode,
  country: z.string().default('MY').refine(val => val === 'MY', {
    message: 'Only Malaysian addresses are supported'
  })
});

// Buyer/Supplier information schema
export const partySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  tin: z.string().min(1, 'TIN is required').max(20),
  brn: z.string().max(50).optional(),
  sstNumber: z.string().max(50).optional(),
  email: emailSchema.optional(),
  phone: malaysianPhone,
  address: addressSchema
});

// Invoice line item schema
export const invoiceLineSchema = z.object({
  lineNumber: z.number().int().positive('Line number must be positive'),
  itemDescription: z.string().min(1, 'Item description is required').max(500),
  itemSku: z.string().max(100).optional(),
  quantity: decimalString.refine(val => parseFloat(val) > 0, {
    message: 'Quantity must be greater than 0'
  }),
  unitPrice: decimalString.refine(val => parseFloat(val) >= 0, {
    message: 'Unit price cannot be negative'
  }),
  discountAmount: decimalString.default('0.00'),
  lineTotal: decimalString.refine(val => parseFloat(val) >= 0, {
    message: 'Line total cannot be negative'
  }),
  sstRate: decimalString.default('0.00').refine(val => {
    const rate = parseFloat(val);
    return rate >= 0 && rate <= 100;
  }, {
    message: 'SST rate must be between 0 and 100'
  }),
  sstAmount: decimalString.default('0.00'),
  taxExemptionCode: z.string().max(20).optional(),
  metadata: z.record(z.any()).optional()
}).refine(data => {
  // Validate line total calculation
  const quantity = parseFloat(data.quantity);
  const unitPrice = parseFloat(data.unitPrice);
  const discount = parseFloat(data.discountAmount);
  const expectedLineTotal = (quantity * unitPrice) - discount;
  const actualLineTotal = parseFloat(data.lineTotal);
  
  return Math.abs(actualLineTotal - expectedLineTotal) < 0.01;
}, {
  message: 'Line total must equal (quantity × unit price) - discount amount',
  path: ['lineTotal']
}).refine(data => {
  // Validate SST calculation
  const lineTotal = parseFloat(data.lineTotal);
  const sstRate = parseFloat(data.sstRate);
  const expectedSst = (lineTotal * sstRate) / 100;
  const actualSst = parseFloat(data.sstAmount);
  
  return Math.abs(actualSst - expectedSst) < 0.01;
}, {
  message: 'SST amount must equal line total × SST rate ÷ 100',
  path: ['sstAmount']
});

// Main invoice schema
export const invoiceSchema = z.object({
  // Basic invoice information
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  eInvoiceType: z.enum(['01', '02', '03', '04'], {
    errorMap: () => ({ message: 'Invalid e-Invoice type' })
  }).default('01'),
  
  // Dates
  issueDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Issue date must be in YYYY-MM-DD format'
  ),
  dueDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Due date must be in YYYY-MM-DD format'
  ).optional(),
  
  // Currency and exchange
  currency: z.enum(SUPPORTED_CURRENCIES).default('MYR'),
  exchangeRate: decimalString.default('1.000000').refine(val => {
    const rate = parseFloat(val);
    return rate > 0 && rate <= 9999.999999;
  }, {
    message: 'Exchange rate must be positive and within valid range'
  }),
  
  // Amounts
  subtotal: decimalString.refine(val => parseFloat(val) >= 0, {
    message: 'Subtotal cannot be negative'
  }),
  totalDiscount: decimalString.default('0.00'),
  sstAmount: decimalString.default('0.00'),
  grandTotal: positiveDecimalString,
  
  // Consolidation (B2C)
  isConsolidated: z.boolean().default(false),
  consolidationPeriod: z.string().regex(
    /^\d{4}-\d{2}$/,
    'Consolidation period must be in YYYY-MM format'
  ).optional(),
  
  // Reference for credit/debit notes
  referenceInvoiceId: z.string().uuid().optional(),
  referenceInvoiceNumber: z.string().max(100).optional(),
  
  // Status and validation
  status: z.enum(INVOICE_STATUS).default('draft'),
  validationScore: z.number().int().min(0).max(100).default(0),
  
  // Metadata
  notes: z.string().max(1000).optional(),
  internalRef: z.string().max(100).optional(),
  poNumber: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional()
}).refine(data => {
  // Currency validation: if not MYR, exchange rate should not be 1.0
  if (data.currency !== 'MYR' && parseFloat(data.exchangeRate) === 1.0) {
    return false;
  }
  return true;
}, {
  message: 'Exchange rate must be provided for non-MYR currencies',
  path: ['exchangeRate']
}).refine(data => {
  // Credit/Debit note validation
  if (['02', '03'].includes(data.eInvoiceType)) {
    return data.referenceInvoiceId || data.referenceInvoiceNumber;
  }
  return true;
}, {
  message: 'Credit and debit notes must reference an original invoice',
  path: ['referenceInvoiceId']
}).refine(data => {
  // Due date validation
  if (data.dueDate) {
    const issueDate = new Date(data.issueDate);
    const dueDate = new Date(data.dueDate);
    return dueDate >= issueDate;
  }
  return true;
}, {
  message: 'Due date must be on or after issue date',
  path: ['dueDate']
});

// Complete invoice with line items
export const completeInvoiceSchema = z.object({
  invoice: invoiceSchema,
  lineItems: z.array(invoiceLineSchema).min(1, 'At least one line item is required'),
  supplier: partySchema.optional(), // Will be auto-filled from organization
  buyer: partySchema.optional() // Optional for B2C consolidated invoices
}).refine(data => {
  // Validate totals match line items
  const lineItemsSubtotal = data.lineItems.reduce((sum, line) => 
    sum + parseFloat(line.lineTotal), 0
  );
  const invoiceSubtotal = parseFloat(data.invoice.subtotal);
  
  return Math.abs(lineItemsSubtotal - invoiceSubtotal) < 0.01;
}, {
  message: 'Invoice subtotal must match sum of line item totals',
  path: ['invoice', 'subtotal']
}).refine(data => {
  // Validate SST amounts match
  const lineItemsSst = data.lineItems.reduce((sum, line) => 
    sum + parseFloat(line.sstAmount), 0
  );
  const invoiceSst = parseFloat(data.invoice.sstAmount);
  
  return Math.abs(lineItemsSst - invoiceSst) < 0.01;
}, {
  message: 'Invoice SST amount must match sum of line item SST amounts',
  path: ['invoice', 'sstAmount']
}).refine(data => {
  // Validate grand total calculation
  const subtotal = parseFloat(data.invoice.subtotal);
  const discount = parseFloat(data.invoice.totalDiscount);
  const sst = parseFloat(data.invoice.sstAmount);
  const expectedGrandTotal = subtotal - discount + sst;
  const actualGrandTotal = parseFloat(data.invoice.grandTotal);
  
  return Math.abs(actualGrandTotal - expectedGrandTotal) < 0.01;
}, {
  message: 'Grand total must equal subtotal - discount + SST',
  path: ['invoice', 'grandTotal']
}).refine(data => {
  // B2C consolidation validation: buyer is optional only for consolidated invoices
  if (!data.invoice.isConsolidated && !data.buyer) {
    return false;
  }
  return true;
}, {
  message: 'Buyer information is required for non-consolidated invoices',
  path: ['buyer']
});

// Base schemas for creation (excluding auto-generated fields)
export const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  eInvoiceType: z.enum(['01', '02', '03', '04']).default('01'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default('MYR'),
  exchangeRate: z.string().regex(/^\d+\.\d{6}$/, 'Exchange rate must have 6 decimal places').default('1.000000'),
  subtotal: z.string().regex(/^\d+\.\d{2}$/, 'Subtotal must have 2 decimal places'),
  sstAmount: z.string().regex(/^\d+\.\d{2}$/, 'SST amount must have 2 decimal places').default('0.00'),
  totalDiscount: z.string().regex(/^\d+\.\d{2}$/, 'Total discount must have 2 decimal places').default('0.00'),
  grandTotal: z.string().regex(/^\d+\.\d{2}$/, 'Grand total must have 2 decimal places'),
  isConsolidated: z.boolean().default(false),
  referenceInvoiceId: z.string().optional(),
  status: z.enum(['draft', 'validated', 'submitted', 'approved', 'rejected', 'cancelled']).default('draft'),
  buyerName: z.string().max(200).optional(),
  buyerTin: z.string().max(20).optional(),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().max(20).optional(),
  buyerAddress: z.string().max(500).optional(),
  poNumber: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const lineItemCreateSchema = z.object({
  itemDescription: z.string().min(1, 'Item description is required').max(300),
  itemSku: z.string().max(50).optional(),
  quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, 'Quantity must be a valid number with up to 3 decimal places'),
  unitPrice: z.string().regex(/^\d+\.\d{2}$/, 'Unit price must have 2 decimal places'),
  discountAmount: z.string().regex(/^\d+\.\d{2}$/, 'Discount amount must have 2 decimal places').default('0.00'),
  lineTotal: z.string().regex(/^\d+\.\d{2}$/, 'Line total must have 2 decimal places'),
  sstRate: z.string().regex(/^\d+\.\d{2}$/, 'SST rate must have 2 decimal places').default('0.00'),
  sstAmount: z.string().regex(/^\d+\.\d{2}$/, 'SST amount must have 2 decimal places').default('0.00'),
  notes: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export const lineItemUpdateSchema = lineItemCreateSchema.partial();

// Validation result types
export type ValidationError = {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
};

export type ValidationResult = {
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
};

// Type exports
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
export type Party = z.infer<typeof partySchema>;
export type Address = z.infer<typeof addressSchema>;
export type CompleteInvoice = z.infer<typeof completeInvoiceSchema>;
export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdate = z.infer<typeof invoiceUpdateSchema>;
export type LineItemCreate = z.infer<typeof lineItemCreateSchema>;
export type LineItemUpdate = z.infer<typeof lineItemUpdateSchema>;

// Helper functions for validation
export function validateInvoiceNumber(invoiceNumber: string, orgPrefix?: string): boolean {
  // Basic format validation
  if (!/^[A-Z0-9\-\/]{1,100}$/.test(invoiceNumber)) {
    return false;
  }
  
  // Optional organization prefix validation
  if (orgPrefix && !invoiceNumber.startsWith(orgPrefix)) {
    return false;
  }
  
  return true;
}

export function calculateLineTotal(quantity: number, unitPrice: number, discount: number = 0): number {
  return Math.round((quantity * unitPrice - discount) * 100) / 100;
}

export function calculateSstAmount(lineTotal: number, sstRate: number): number {
  return Math.round((lineTotal * sstRate / 100) * 100) / 100;
}

export function calculateGrandTotal(subtotal: number, discount: number, sstAmount: number): number {
  return Math.round((subtotal - discount + sstAmount) * 100) / 100;
}