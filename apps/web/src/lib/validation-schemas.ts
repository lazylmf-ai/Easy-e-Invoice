// Malaysian e-Invoice validation schemas for frontend
// Copied from @einvoice/validation package to avoid workspace dependencies

import { z } from 'zod';

// Currency validation
export const SUPPORTED_CURRENCIES = ['MYR', 'USD', 'EUR', 'SGD', 'GBP', 'AUD', 'JPY', 'CNY'] as const;

// e-Invoice types
export const E_INVOICE_TYPES = {
  '01': 'Invoice',
  '02': 'Credit Note', 
  '03': 'Debit Note',
  '04': 'Refund Note',
  '11': 'Self-Billed Invoice',
  '12': 'Self-Billed Credit Note',
  '13': 'Self-Billed Debit Note',
  '14': 'Self-Billed Refund Note'
} as const;

// Malaysian TIN validation regex
const TIN_REGEX = /^(C\d{10}|\d{12})$/;

// SST rate validation (0%, 6%, or 10%)
const SST_RATES = [0, 6, 10] as const;

// Base schemas
export const lineItemCreateSchema = z.object({
  itemDescription: z.string().min(1, 'Item description is required').max(500),
  itemSku: z.string().max(100).optional(),
  quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, 'Quantity must be a valid number').default('1'),
  unitPrice: z.string().regex(/^\d+\.\d{2}$/, 'Unit price must have 2 decimal places'),
  discountAmount: z.string().regex(/^\d+\.\d{2}$/, 'Discount must have 2 decimal places').default('0.00'),
  sstRate: z.number().refine((rate): rate is typeof SST_RATES[number] => SST_RATES.includes(rate as any), 'Invalid SST rate').default(0),
  sstAmount: z.string().regex(/^\d+\.\d{2}$/, 'SST amount must have 2 decimal places').default('0.00'),
  taxExemptionCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  eInvoiceType: z.enum(['01', '02', '03', '04', '11', '12', '13', '14']).default('01'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default('MYR'),
  exchangeRate: z.string().regex(/^\d+\.\d{2,6}$/, 'Exchange rate must have 2-6 decimal places').default('1.000000'),
  poNumber: z.string().max(50).optional(),
  internalRef: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
  
  // Buyer information
  buyerName: z.string().min(1, 'Buyer name is required').max(255),
  buyerTin: z.string().regex(TIN_REGEX, 'Invalid Malaysian TIN format').optional(),
  buyerCountryCode: z.string().length(2).default('MY'),
  buyerIsIndividual: z.boolean().default(false),
  buyerAddress: z.object({
    line1: z.string().max(255),
    line2: z.string().max(255).optional(),
    city: z.string().max(100),
    state: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().length(2).default('MY'),
  }).optional(),
  buyerContact: z.object({
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
  }).optional(),
  
  // Line items
  lineItems: z.array(lineItemCreateSchema).min(1, 'At least one line item is required'),
});

// Calculation utilities
export function calculateLineTotal(quantity: string, unitPrice: string, discountAmount: string = '0.00'): string {
  const qty = parseFloat(quantity);
  const price = parseFloat(unitPrice);
  const discount = parseFloat(discountAmount);
  const total = (qty * price) - discount;
  return total.toFixed(2);
}

export function calculateSstAmount(lineTotal: string, sstRate: number): string {
  const total = parseFloat(lineTotal);
  const sst = (total * sstRate) / 100;
  return sst.toFixed(2);
}

export function calculateGrandTotal(lineItems: Array<{ 
  quantity: string; 
  unitPrice: string; 
  discountAmount?: string; 
  sstRate: number; 
}>): { subtotal: string; totalSst: string; grandTotal: string } {
  let subtotal = 0;
  let totalSst = 0;

  lineItems.forEach(item => {
    const lineTotal = parseFloat(calculateLineTotal(
      item.quantity, 
      item.unitPrice, 
      item.discountAmount || '0.00'
    ));
    const sstAmount = parseFloat(calculateSstAmount(lineTotal.toFixed(2), item.sstRate));
    
    subtotal += lineTotal;
    totalSst += sstAmount;
  });

  const grandTotal = subtotal + totalSst;

  return {
    subtotal: subtotal.toFixed(2),
    totalSst: totalSst.toFixed(2),
    grandTotal: grandTotal.toFixed(2)
  };
}

// Type exports
export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;
export type LineItemCreate = z.infer<typeof lineItemCreateSchema>;