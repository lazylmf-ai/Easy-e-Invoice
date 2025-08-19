// Quick test to verify validation functionality
import { validateInvoice, calculateValidationScore, invoiceSchema } from './index';
import { validateTinFormat } from './tin-validation';

// Test data
const mockOrg = {
  tin: 'C1234567890',
  industryCode: '62010',
  isSstRegistered: true
};

const mockInvoice = {
  invoiceNumber: 'INV-2024-001',
  eInvoiceType: '01' as const,
  issueDate: '2024-08-17',
  dueDate: '2024-09-17',
  currency: 'MYR' as const,
  exchangeRate: '1.000000',
  subtotal: '1000.00',
  sstAmount: '60.00',
  totalDiscount: '0.00',
  grandTotal: '1060.00',
  isConsolidated: false,
  consolidationPeriod: '2024-08',
  referenceInvoiceId: undefined,
  status: 'draft' as const,
  buyerName: 'Test Buyer',
  buyerTin: 'C0987654321',
  notes: 'Test invoice',
  validationScore: 100
};

const mockLines = [
  {
    lineNumber: 1,
    itemDescription: 'Professional Services',
    quantity: '1.000',
    unitPrice: '1000.00',
    discountAmount: '0.00',
    lineTotal: '1000.00',
    sstRate: '6.00',
    sstAmount: '60.00'
  }
];

// Test validation
console.log('Testing Malaysian e-Invoice validation...');

// Test TIN validation
try {
  const validTinResult = validateTinFormat('C1234567890');
  if (validTinResult.isValid) {
    console.log('✅ Valid TIN format test passed:', validTinResult);
  } else {
    console.error('❌ TIN validation failed:', validTinResult.errors);
  }
} catch (error) {
  console.error('❌ TIN validation failed:', error);
}

// Test invalid TIN
try {
  const invalidTinResult = validateTinFormat('INVALID');
  if (!invalidTinResult.isValid) {
    console.log('✅ Invalid TIN correctly rejected');
  } else {
    console.log('❌ Invalid TIN should have failed');
  }
} catch (error) {
  console.log('✅ Invalid TIN correctly rejected with error');
}

// Test invoice validation
const validationResults = validateInvoice(mockInvoice, mockLines, mockOrg);
console.log('Validation results:', validationResults);

const score = calculateValidationScore(validationResults);
console.log('Validation score:', score);

// Test invoice schema
try {
  const validInvoice = invoiceSchema.parse({
    invoiceNumber: 'INV-001',
    eInvoiceType: '01',
    issueDate: '2024-08-17',
    currency: 'MYR',
    exchangeRate: 1.0,
    isConsolidated: false,
    lineItems: [
      {
        lineNumber: 1,
        itemDescription: 'Test Service',
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 0,
        sstRate: 6
      }
    ]
  });
  console.log('✅ Invoice schema validation passed');
} catch (error) {
  console.error('❌ Invoice schema validation failed:', error);
}

console.log('Validation package test completed!');