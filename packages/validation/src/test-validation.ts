// Quick test to verify validation functionality
import { validateInvoice, calculateValidationScore, tinSchema, invoiceSchema } from './index';

// Test data
const mockOrg = {
  tin: 'C1234567890',
  industryCode: '62010'
};

const mockInvoice = {
  eInvoiceType: '01',
  currency: 'MYR',
  exchangeRate: '1.0',
  isConsolidated: false,
  referenceInvoiceId: null
};

const mockLines = [
  {
    lineTotal: '1000.00',
    sstRate: '6.00',
    sstAmount: '60.00'
  }
];

// Test validation
console.log('Testing Malaysian e-Invoice validation...');

// Test TIN schema
try {
  const validTin = tinSchema.parse('C1234567890');
  console.log('✅ Valid TIN format test passed:', validTin);
} catch (error) {
  console.error('❌ TIN validation failed:', error);
}

// Test invalid TIN
try {
  tinSchema.parse('INVALID');
  console.log('❌ Invalid TIN should have failed');
} catch (error) {
  console.log('✅ Invalid TIN correctly rejected');
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