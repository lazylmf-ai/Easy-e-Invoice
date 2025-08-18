import { describe, it, expect } from 'vitest';
import { validateInvoice, calculateValidationScore, MALAYSIAN_VALIDATION_RULES, B2C_CONSOLIDATION_RULES } from './malaysian-rules';
// Test data factories
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
const createCompleteInvoice = (overrides = {}) => ({
    invoice: createTestInvoice(),
    lineItems: [createTestInvoiceLine()],
    buyer: createTestBuyer(),
    ...overrides
});
describe('Malaysian Validation Rules', () => {
    describe('MY-001: Supplier TIN Validation', () => {
        it('should pass for valid corporate TIN format', () => {
            const org = createTestOrganization({ tin: 'C1234567890' });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const tinError = results.find(r => r.ruleCode === 'MY-001');
            expect(tinError).toBeUndefined();
        });
        it('should pass for valid individual TIN format', () => {
            const org = createTestOrganization({ tin: '123456789012' });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const tinError = results.find(r => r.ruleCode === 'MY-001');
            expect(tinError).toBeUndefined();
        });
        it('should fail for invalid TIN format', () => {
            const org = createTestOrganization({ tin: 'INVALID123' });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const tinError = results.find(r => r.ruleCode === 'MY-001');
            expect(tinError).toBeDefined();
            expect(tinError?.severity).toBe('error');
            expect(tinError?.fieldPath).toBe('supplier.tin');
            expect(tinError?.message).toContain('TIN format invalid');
        });
        it('should fail for empty TIN', () => {
            const org = createTestOrganization({ tin: '' });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const tinError = results.find(r => r.ruleCode === 'MY-001');
            expect(tinError).toBeDefined();
            expect(tinError?.severity).toBe('error');
        });
    });
    describe('MY-002: Buyer TIN Validation', () => {
        it('should pass for valid buyer TIN', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const buyer = createTestBuyer({ tin: 'C9876543210' });
            const results = validateInvoice(invoice, lines, org, buyer);
            const tinError = results.find(r => r.ruleCode === 'MY-002');
            expect(tinError).toBeUndefined();
        });
        it('should pass when buyer TIN is missing for consolidated invoices', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({ isConsolidated: true });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const tinError = results.find(r => r.ruleCode === 'MY-002');
            expect(tinError).toBeUndefined();
        });
        it('should fail for invalid buyer TIN format', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine()];
            const buyer = createTestBuyer({ tin: 'INVALID' });
            const results = validateInvoice(invoice, lines, org, buyer);
            const tinError = results.find(r => r.ruleCode === 'MY-002');
            expect(tinError).toBeDefined();
            expect(tinError?.severity).toBe('error');
            expect(tinError?.fieldPath).toBe('buyer.tin');
        });
    });
    describe('MY-003: SST Calculation Validation', () => {
        it('should pass for correct SST calculation', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({
                    lineTotal: '1000.00',
                    sstRate: '6.00',
                    sstAmount: '60.00'
                })];
            const results = validateInvoice(invoice, lines, org);
            const sstError = results.find(r => r.ruleCode === 'MY-003');
            expect(sstError).toBeUndefined();
        });
        it('should fail for incorrect SST calculation', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({
                    lineTotal: '1000.00',
                    sstRate: '6.00',
                    sstAmount: '50.00' // Should be 60.00
                })];
            const results = validateInvoice(invoice, lines, org);
            const sstError = results.find(r => r.ruleCode === 'MY-003');
            expect(sstError).toBeDefined();
            expect(sstError?.severity).toBe('error');
            expect(sstError?.fieldPath).toBe('line_items[].sst_amount');
        });
        it('should handle multiple line items with different SST rates', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [
                createTestInvoiceLine({
                    lineTotal: '1000.00',
                    sstRate: '6.00',
                    sstAmount: '60.00'
                }),
                createTestInvoiceLine({
                    lineNumber: 2,
                    lineTotal: '500.00',
                    sstRate: '0.00',
                    sstAmount: '0.00'
                })
            ];
            const results = validateInvoice(invoice, lines, org);
            const sstError = results.find(r => r.ruleCode === 'MY-003');
            expect(sstError).toBeUndefined();
        });
        it('should handle rounding differences within tolerance', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({
                    lineTotal: '33.33',
                    sstRate: '6.00',
                    sstAmount: '2.00' // Actual: 1.9998, rounded to 2.00
                })];
            const results = validateInvoice(invoice, lines, org);
            const sstError = results.find(r => r.ruleCode === 'MY-003');
            expect(sstError).toBeUndefined();
        });
    });
    describe('MY-004: B2C Consolidation Validation', () => {
        it('should pass for non-consolidated invoices', () => {
            const org = createTestOrganization({ industryCode: '35101' }); // Electric power
            const invoice = createTestInvoice({ isConsolidated: false });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const consolidationError = results.find(r => r.ruleCode === 'MY-004');
            expect(consolidationError).toBeUndefined();
        });
        it('should pass for allowed industry consolidation', () => {
            const org = createTestOrganization({ industryCode: '62010' }); // IT Services
            const invoice = createTestInvoice({ isConsolidated: true });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const consolidationError = results.find(r => r.ruleCode === 'MY-004');
            expect(consolidationError).toBeUndefined();
        });
        it('should fail for prohibited industry consolidation', () => {
            const org = createTestOrganization({ industryCode: '35101' }); // Electric power
            const invoice = createTestInvoice({ isConsolidated: true });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const consolidationError = results.find(r => r.ruleCode === 'MY-004');
            expect(consolidationError).toBeDefined();
            expect(consolidationError?.severity).toBe('error');
            expect(consolidationError?.fieldPath).toBe('invoice.is_consolidated');
        });
        it('should test all prohibited industry codes', () => {
            const prohibitedCodes = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
            prohibitedCodes.forEach(code => {
                const org = createTestOrganization({ industryCode: code });
                const invoice = createTestInvoice({ isConsolidated: true });
                const lines = [createTestInvoiceLine()];
                const results = validateInvoice(invoice, lines, org);
                const consolidationError = results.find(r => r.ruleCode === 'MY-004');
                expect(consolidationError).toBeDefined();
                expect(consolidationError?.severity).toBe('error');
            });
        });
    });
    describe('MY-005: Exchange Rate Validation', () => {
        it('should pass for MYR currency without exchange rate', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                currency: 'MYR',
                exchangeRate: '1.000000'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const exchangeError = results.find(r => r.ruleCode === 'MY-005');
            expect(exchangeError).toBeUndefined();
        });
        it('should pass for foreign currency with exchange rate', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                currency: 'USD',
                exchangeRate: '4.350000'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const exchangeError = results.find(r => r.ruleCode === 'MY-005');
            expect(exchangeError).toBeUndefined();
        });
        it('should fail for foreign currency without exchange rate', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                currency: 'USD',
                exchangeRate: '1.000000'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const exchangeError = results.find(r => r.ruleCode === 'MY-005');
            expect(exchangeError).toBeDefined();
            expect(exchangeError?.severity).toBe('error');
            expect(exchangeError?.fieldPath).toBe('invoice.exchange_rate');
        });
    });
    describe('MY-006: Credit/Debit Note Reference Validation', () => {
        it('should pass for regular invoices without reference', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                eInvoiceType: '01',
                referenceInvoiceId: undefined
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const refError = results.find(r => r.ruleCode === 'MY-006');
            expect(refError).toBeUndefined();
        });
        it('should pass for credit note with reference', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                eInvoiceType: '02',
                referenceInvoiceId: 'INV-2024-001'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const refError = results.find(r => r.ruleCode === 'MY-006');
            expect(refError).toBeUndefined();
        });
        it('should fail for credit note without reference', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                eInvoiceType: '02',
                referenceInvoiceId: undefined
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const refError = results.find(r => r.ruleCode === 'MY-006');
            expect(refError).toBeDefined();
            expect(refError?.severity).toBe('error');
            expect(refError?.fieldPath).toBe('invoice.reference_invoice_id');
        });
        it('should fail for debit note without reference', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                eInvoiceType: '03',
                referenceInvoiceId: undefined
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const refError = results.find(r => r.ruleCode === 'MY-006');
            expect(refError).toBeDefined();
            expect(refError?.severity).toBe('error');
        });
    });
    describe('MY-007: Buyer Information Validation', () => {
        it('should pass for non-consolidated invoice with buyer', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({ isConsolidated: false });
            const lines = [createTestInvoiceLine()];
            const buyer = createTestBuyer();
            const results = validateInvoice(invoice, lines, org, buyer);
            const buyerError = results.find(r => r.ruleCode === 'MY-007');
            expect(buyerError).toBeUndefined();
        });
        it('should pass for consolidated invoice without buyer', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({ isConsolidated: true });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const buyerError = results.find(r => r.ruleCode === 'MY-007');
            expect(buyerError).toBeUndefined();
        });
        it('should fail for non-consolidated invoice without buyer', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({ isConsolidated: false });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const buyerError = results.find(r => r.ruleCode === 'MY-007');
            expect(buyerError).toBeDefined();
            expect(buyerError?.severity).toBe('error');
            expect(buyerError?.fieldPath).toBe('invoice.buyer_required');
        });
    });
    describe('MY-008: SST Registration Validation', () => {
        it('should pass when SST registered organization charges SST', () => {
            const org = createTestOrganization({ isSstRegistered: true });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({ sstRate: '6.00' })];
            const results = validateInvoice(invoice, lines, org);
            const sstRegError = results.find(r => r.ruleCode === 'MY-008');
            expect(sstRegError).toBeUndefined();
        });
        it('should pass when non-SST registered organization does not charge SST', () => {
            const org = createTestOrganization({ isSstRegistered: false });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({ sstRate: '0.00' })];
            const results = validateInvoice(invoice, lines, org);
            const sstRegError = results.find(r => r.ruleCode === 'MY-008');
            expect(sstRegError).toBeUndefined();
        });
        it('should warn when non-SST registered organization charges SST', () => {
            const org = createTestOrganization({ isSstRegistered: false });
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({ sstRate: '6.00' })];
            const results = validateInvoice(invoice, lines, org);
            const sstRegError = results.find(r => r.ruleCode === 'MY-008');
            expect(sstRegError).toBeDefined();
            expect(sstRegError?.severity).toBe('warning');
            expect(sstRegError?.fieldPath).toBe('line_items[].sst_rate');
        });
    });
    describe('MY-009: Consolidation Period Validation', () => {
        it('should pass for matching consolidation period and issue date', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                isConsolidated: true,
                issueDate: '2024-01-15',
                consolidationPeriod: '2024-01'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const periodError = results.find(r => r.ruleCode === 'MY-009');
            expect(periodError).toBeUndefined();
        });
        it('should pass for non-consolidated invoices', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                isConsolidated: false,
                issueDate: '2024-01-15',
                consolidationPeriod: undefined
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const periodError = results.find(r => r.ruleCode === 'MY-009');
            expect(periodError).toBeUndefined();
        });
        it('should warn for mismatched consolidation period and issue date', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                isConsolidated: true,
                issueDate: '2024-01-15',
                consolidationPeriod: '2024-02'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const periodError = results.find(r => r.ruleCode === 'MY-009');
            expect(periodError).toBeDefined();
            expect(periodError?.severity).toBe('warning');
            expect(periodError?.fieldPath).toBe('invoice.consolidation_period');
        });
    });
    describe('MY-010: Due Date Validation', () => {
        it('should pass for reasonable payment terms', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                issueDate: '2024-01-15',
                dueDate: '2024-02-15'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const dueDateError = results.find(r => r.ruleCode === 'MY-010');
            expect(dueDateError).toBeUndefined();
        });
        it('should pass when due date is not specified', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                issueDate: '2024-01-15',
                dueDate: undefined
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const dueDateError = results.find(r => r.ruleCode === 'MY-010');
            expect(dueDateError).toBeUndefined();
        });
        it('should warn for due date over 90 days', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                issueDate: '2024-01-15',
                dueDate: '2024-05-15' // 4 months later
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const dueDateError = results.find(r => r.ruleCode === 'MY-010');
            expect(dueDateError).toBeDefined();
            expect(dueDateError?.severity).toBe('warning');
            expect(dueDateError?.fieldPath).toBe('invoice.due_date');
        });
        it('should warn for due date before issue date', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                issueDate: '2024-01-15',
                dueDate: '2024-01-10'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const dueDateError = results.find(r => r.ruleCode === 'MY-010');
            expect(dueDateError).toBeDefined();
            expect(dueDateError?.severity).toBe('warning');
        });
    });
    describe('MY-011: Foreign Currency Detection', () => {
        it('should pass (no info message) for MYR currency', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({ currency: 'MYR' });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const currencyInfo = results.find(r => r.ruleCode === 'MY-011');
            expect(currencyInfo).toBeUndefined();
        });
        it('should show info message for foreign currency', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice({
                currency: 'USD',
                exchangeRate: '4.350000'
            });
            const lines = [createTestInvoiceLine()];
            const results = validateInvoice(invoice, lines, org);
            const currencyInfo = results.find(r => r.ruleCode === 'MY-011');
            expect(currencyInfo).toBeDefined();
            expect(currencyInfo?.severity).toBe('info');
            expect(currencyInfo?.fieldPath).toBe('invoice.currency');
        });
    });
    describe('MY-012: High Quantity Detection', () => {
        it('should pass for normal quantities', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({ quantity: '100.000' })];
            const results = validateInvoice(invoice, lines, org);
            const quantityInfo = results.find(r => r.ruleCode === 'MY-012');
            expect(quantityInfo).toBeUndefined();
        });
        it('should show info message for high quantities', () => {
            const org = createTestOrganization();
            const invoice = createTestInvoice();
            const lines = [createTestInvoiceLine({ quantity: '15000.000' })];
            const results = validateInvoice(invoice, lines, org);
            const quantityInfo = results.find(r => r.ruleCode === 'MY-012');
            expect(quantityInfo).toBeDefined();
            expect(quantityInfo?.severity).toBe('info');
            expect(quantityInfo?.fieldPath).toBe('line_items[].quantity');
        });
    });
});
describe('Validation Score Calculation', () => {
    it('should return 100 for no validation errors', () => {
        const results = [];
        const score = calculateValidationScore(results);
        expect(score).toBe(100);
    });
    it('should calculate correct score with errors and warnings', () => {
        const results = [
            {
                ruleCode: 'MY-001',
                severity: 'error',
                fieldPath: 'supplier.tin',
                message: 'Error message',
                fixSuggestion: 'Fix suggestion',
                isResolved: false
            },
            {
                ruleCode: 'MY-008',
                severity: 'warning',
                fieldPath: 'line_items[].sst_rate',
                message: 'Warning message',
                fixSuggestion: 'Fix suggestion',
                isResolved: false
            }
        ];
        const score = calculateValidationScore(results);
        // Score should be less than 100 but greater than 0
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(100);
    });
    it('should not go below 0', () => {
        const results = MALAYSIAN_VALIDATION_RULES.map(rule => ({
            ruleCode: rule.code,
            severity: 'error',
            fieldPath: rule.field,
            message: rule.message,
            fixSuggestion: rule.fixHint,
            isResolved: false
        }));
        const score = calculateValidationScore(results);
        expect(score).toBeGreaterThanOrEqual(0);
    });
});
describe('B2C Consolidation Rules', () => {
    describe('validateConsolidation', () => {
        it('should allow consolidation for permitted industries', () => {
            const invoice = createTestInvoice({ isConsolidated: true });
            const org = createTestOrganization({ industryCode: '62010' }); // IT Services
            const result = B2C_CONSOLIDATION_RULES.validateConsolidation(invoice, org, 100);
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
        });
        it('should reject consolidation for prohibited industries', () => {
            const invoice = createTestInvoice({ isConsolidated: true });
            const org = createTestOrganization({ industryCode: '35101' }); // Electric power
            const result = B2C_CONSOLIDATION_RULES.validateConsolidation(invoice, org, 100);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Industry not eligible for consolidation');
            expect(result.action).toBe('Issue individual invoices for each transaction');
        });
        it('should handle conditional restrictions for retail', () => {
            const invoice = createTestInvoice({ isConsolidated: true });
            const org = createTestOrganization({ industryCode: '47' }); // Retail
            // Within limit
            const resultOk = B2C_CONSOLIDATION_RULES.validateConsolidation(invoice, org, 150);
            expect(resultOk.allowed).toBe(true);
            // Exceeds limit
            const resultFail = B2C_CONSOLIDATION_RULES.validateConsolidation(invoice, org, 250);
            expect(resultFail.allowed).toBe(false);
            expect(resultFail.reason).toContain('200 transactions');
        });
        it('should test all prohibited industry codes', () => {
            const prohibitedCodes = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
            const invoice = createTestInvoice({ isConsolidated: true });
            prohibitedCodes.forEach(code => {
                const org = createTestOrganization({ industryCode: code });
                const result = B2C_CONSOLIDATION_RULES.validateConsolidation(invoice, org, 100);
                expect(result.allowed).toBe(false);
                expect(result.reason).toBe('Industry not eligible for consolidation');
            });
        });
    });
});
describe('Error Handling in Validation', () => {
    it('should handle validation rule exceptions gracefully', () => {
        const org = createTestOrganization();
        const invoice = createTestInvoice();
        const lines = [createTestInvoiceLine()];
        // This should not throw even with potentially problematic data
        expect(() => {
            validateInvoice(invoice, lines, org);
        }).not.toThrow();
    });
    it('should handle null/undefined values gracefully', () => {
        const org = createTestOrganization({ tin: '', industryCode: undefined });
        const invoice = createTestInvoice({
            currency: 'USD',
            exchangeRate: '',
            dueDate: undefined,
            consolidationPeriod: undefined
        });
        const lines = [createTestInvoiceLine({
                lineTotal: '',
                sstRate: '',
                sstAmount: ''
            })];
        expect(() => {
            validateInvoice(invoice, lines, org);
        }).not.toThrow();
    });
});
