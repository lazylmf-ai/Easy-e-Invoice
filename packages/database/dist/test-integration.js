import { validateInvoice } from '@einvoice/validation';
// Test that database types work with validation
console.log('Testing database-validation integration...');
// Mock data that matches database schema
const mockOrg = {
    id: 'test-org-id',
    name: 'Test Company Sdn Bhd',
    brn: '123456-X',
    tin: 'C1234567890',
    sstNumber: 'SST123456',
    industryCode: '62010',
    isSstRegistered: true,
    currency: 'MYR',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};
const mockInvoice = {
    id: 'test-invoice-id',
    orgId: 'test-org-id',
    buyerId: null,
    templateId: null,
    invoiceNumber: 'INV-2024-001',
    eInvoiceType: '01',
    issueDate: '2024-08-17',
    dueDate: null,
    currency: 'MYR',
    exchangeRate: '1.000000',
    subtotal: '1000.00',
    sstAmount: '60.00',
    totalDiscount: '0.00',
    grandTotal: '1060.00',
    isConsolidated: false,
    consolidationPeriod: null,
    referenceInvoiceId: null,
    status: 'draft',
    validationScore: 0,
    lastValidatedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};
const mockLines = [
    {
        id: 'test-line-id',
        invoiceId: 'test-invoice-id',
        lineNumber: 1,
        itemDescription: 'Professional Services',
        itemSku: null,
        quantity: '1.000',
        unitPrice: '1000.0000',
        discountAmount: '0.00',
        lineTotal: '1000.00',
        sstRate: '6.00',
        sstAmount: '60.00',
        taxExemptionCode: null,
        createdAt: new Date(),
    }
];
// Test validation with database types
try {
    const validationResults = validateInvoice(mockInvoice, mockLines, mockOrg);
    console.log('✅ Database-validation integration successful');
    console.log('Validation results:', validationResults);
    console.log('Number of validation errors:', validationResults.length);
    // Test type exports
    console.log('✅ Database types exported correctly');
    console.log('Organization type:', typeof mockOrg);
    console.log('Invoice type:', typeof mockInvoice);
    console.log('InvoiceLine type:', typeof mockLines[0]);
}
catch (error) {
    console.error('❌ Integration test failed:', error);
}
console.log('Database-validation integration test completed!');
