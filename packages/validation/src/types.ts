import { z } from 'zod';

// Malaysian TIN validation
export const tinSchema = z.string().refine(
  (tin) => /^[A-Z]\d{10}$|^\d{12}$/.test(tin),
  'Malaysian TIN must be format C1234567890 or 123456789012'
);

// SST rate validation
export const sstRateSchema = z.number().refine(
  (rate) => [0, 6].includes(rate),
  'SST rate must be 0% or 6%'
);

// Currency validation
export const currencySchema = z.enum(['MYR', 'USD', 'SGD', 'EUR', 'GBP']);

// Invoice type validation
export const invoiceTypeSchema = z.enum(['01', '02', '03', '04']); // invoice, credit, debit, refund

// Organization schema
export const organizationSchema = z.object({
  name: z.string().min(1).max(255),
  brn: z.string().max(20).optional(),
  tin: tinSchema,
  sstNumber: z.string().max(20).optional(),
  industryCode: z.string().max(10).optional(),
  isSstRegistered: z.boolean().default(false),
  currency: currencySchema.default('MYR'),
});

// Buyer schema
export const buyerSchema = z.object({
  name: z.string().min(1).max(255),
  tin: z.string().max(20).optional(),
  countryCode: z.string().length(2).default('MY'),
  isIndividual: z.boolean().default(false),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().default('MY'),
  }).optional(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Invoice line schema
export const invoiceLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemDescription: z.string().min(1).max(500),
  itemSku: z.string().max(100).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  sstRate: sstRateSchema.default(0),
  taxExemptionCode: z.string().max(20).optional(),
}).refine((line) => {
  // Calculate line total
  const lineTotal = (line.quantity * line.unitPrice) - line.discountAmount;
  const sstAmount = (lineTotal * line.sstRate) / 100;
  return lineTotal >= 0;
}, 'Line total must be positive');

// Invoice schema
export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  eInvoiceType: invoiceTypeSchema.default('01'),
  issueDate: z.string().date(),
  dueDate: z.string().date().optional(),
  currency: currencySchema.default('MYR'),
  exchangeRate: z.number().positive().default(1.0),
  isConsolidated: z.boolean().default(false),
  consolidationPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  referenceInvoiceId: z.string().uuid().optional(),
  lineItems: z.array(invoiceLineSchema).min(1),
}).refine((invoice) => {
  // Validation rules
  if (invoice.eInvoiceType === '02' && !invoice.referenceInvoiceId) {
    return false; // Credit note must have reference
  }
  
  if (invoice.currency !== 'MYR' && invoice.exchangeRate === 1.0) {
    return false; // Non-MYR must have exchange rate
  }
  
  return true;
}, 'Invoice validation failed');

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type BuyerInput = z.infer<typeof buyerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;