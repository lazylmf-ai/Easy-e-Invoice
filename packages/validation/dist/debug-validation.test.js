import { describe, it, expect } from 'vitest';
import { validateInvoice, MALAYSIAN_VALIDATION_RULES } from './malaysian-rules';
import { validateTinFormat } from './tin-validation';
import { isB2cConsolidationAllowed } from './industry-codes';
// Test data factories (same as main test)
const createTestOrganization = (overrides = {}) => ({
    tin: 'C1234567890',
    industryCode: '62010',
    isSstRegistered: true,
    ...overrides
});
const createTestBuyer = (overrides = {}) => ({
    tin: 'C9876543210',
    name: 'Test Buyer Sdn Bhd',
    address: {
        line1: '123 Test Street',
        city: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        postcode: '50000',
        country: 'MY'
    },
    ...overrides
});
const createTestInvoice = (overrides = {}) => ({
    invoiceNumber: 'INV-2024-001',
    eInvoiceType: '01',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    currency: 'MYR',
    exchangeRate: '1.000000',
    isConsolidated: false,
    consolidationPeriod: undefined,
    referenceInvoiceId: undefined,
    subtotal: '1000.00',
    totalDiscount: '0.00',
    sstAmount: '60.00',
    grandTotal: '1060.00',
    status: 'draft',
    validationScore: 0,
    notes: 'Test invoice',
    ...overrides
});
const createTestInvoiceLine = (overrides = {}) => ({
    lineNumber: 1,
    itemDescription: 'Professional Consulting Services',
    quantity: '1.000',
    unitPrice: '1000.00',
    discountAmount: '0.00',
    lineTotal: '1000.00',
    sstRate: '6.00',
    sstAmount: '60.00',
    ...overrides
});
describe('Debug Validation Issues', () => {
    it('should debug MY-002 buyer TIN validation', () => {
        const org = createTestOrganization();
        const invoice = createTestInvoice();
        const lines = [createTestInvoiceLine()];
        const buyer = createTestBuyer({ tin: 'INVALID' });
        console.log('Input data:');
        console.log('org:', org);
        console.log('invoice:', invoice);
        console.log('lines:', lines);
        console.log('buyer:', buyer);
        const results = validateInvoice(invoice, lines, org, buyer);
        console.log('All validation results:', results);
        console.log('MY-002 result:', results.find(r => r.ruleCode === 'MY-002'));
        // Let's check the actual rule
        const my002Rule = MALAYSIAN_VALIDATION_RULES.find(r => r.code === 'MY-002');
        console.log('MY-002 rule found:', my002Rule);
        if (my002Rule) {
            const manualResult = my002Rule.check(invoice, lines, org, buyer);
            console.log('Manual MY-002 check result:', manualResult);
            // Test TIN validation directly
            const validation = validateTinFormat(buyer.tin);
            console.log('Direct TIN validation result:', validation);
        }
        // Let's see what all rules return
        console.log('All rule checks:');
        MALAYSIAN_VALIDATION_RULES.forEach(rule => {
            try {
                const result = rule.check(invoice, lines, org, buyer);
                console.log(`${rule.code}: ${result}`);
            }
            catch (error) {
                console.log(`${rule.code}: ERROR - ${error}`);
            }
        });
        expect(results).toBeDefined();
    });
    it('should debug MY-003 SST calculation', () => {
        const org = createTestOrganization();
        const invoice = createTestInvoice();
        const lines = [createTestInvoiceLine({
                lineTotal: '1000.00',
                sstRate: '6.00',
                sstAmount: '50.00' // Should be 60.00
            })];
        console.log('SST Test - Input data:');
        console.log('lines:', lines);
        const results = validateInvoice(invoice, lines, org);
        console.log('SST validation results:', results);
        console.log('MY-003 result:', results.find(r => r.ruleCode === 'MY-003'));
        // Manual SST check
        const line = lines[0];
        const expectedSst = (parseFloat(line.lineTotal) * parseFloat(line.sstRate)) / 100;
        const actualSst = parseFloat(line.sstAmount);
        const isValid = Math.abs(actualSst - expectedSst) < 0.01;
        console.log('Expected SST:', expectedSst);
        console.log('Actual SST:', actualSst);
        console.log('Difference:', Math.abs(actualSst - expectedSst));
        console.log('Is valid:', isValid);
        expect(results).toBeDefined();
    });
    it('should debug MY-004 B2C consolidation', () => {
        const org = createTestOrganization({ industryCode: '35101' }); // Electric power
        const invoice = createTestInvoice({ isConsolidated: true });
        const lines = [createTestInvoiceLine()];
        console.log('B2C Test - Input data:');
        console.log('org industryCode:', org.industryCode);
        console.log('invoice.isConsolidated:', invoice.isConsolidated);
        const results = validateInvoice(invoice, lines, org);
        console.log('B2C validation results:', results);
        console.log('MY-004 result:', results.find(r => r.ruleCode === 'MY-004'));
        // Manual check
        if (!invoice.isConsolidated) {
            console.log('Not consolidated, should pass');
        }
        else {
            const consolidationCheck = isB2cConsolidationAllowed(org.industryCode || '');
            console.log('Consolidation check result:', consolidationCheck);
        }
        // Check the rule definition
        const my004Rule = MALAYSIAN_VALIDATION_RULES.find(r => r.code === 'MY-004');
        console.log('MY-004 rule found:', my004Rule);
        if (my004Rule) {
            const manualResult = my004Rule.check(invoice, lines, org);
            console.log('Manual MY-004 check result:', manualResult);
        }
        expect(results).toBeDefined();
    });
});
