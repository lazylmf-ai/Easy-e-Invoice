interface Invoice {
    id?: string;
    eInvoiceType: string;
    currency: string;
    exchangeRate: string;
    isConsolidated: boolean;
    referenceInvoiceId?: string | null;
}
interface InvoiceLine {
    lineTotal: string;
    sstRate: string;
    sstAmount: string;
}
interface Organization {
    tin: string;
    industryCode?: string | null;
}
export interface ValidationRule {
    code: string;
    severity: 'error' | 'warning' | 'info';
    field: string;
    message: string;
    fixHint: string;
    check: (invoice: Invoice, lines: InvoiceLine[], org: Organization) => boolean;
}
export declare const MALAYSIAN_VALIDATION_RULES: ValidationRule[];
export interface ValidationResult {
    ruleCode: string;
    severity: 'error' | 'warning' | 'info';
    fieldPath: string;
    message: string;
    fixSuggestion: string;
    isResolved: boolean;
}
export declare function validateInvoice(invoice: Invoice, lines: InvoiceLine[], org: Organization): ValidationResult[];
export declare function calculateValidationScore(results: ValidationResult[]): number;
export declare const B2C_CONSOLIDATION_RULES: {
    prohibited: string[];
    conditional: {
        '47': {
            maxTransactions: number;
            warning: string;
        };
        '56': {
            maxAmount: number;
            warning: string;
        };
    };
    validateConsolidation(invoice: Invoice, org: Organization, lineCount: number): {
        allowed: boolean;
        reason?: string;
        action?: string;
    };
};
export {};
//# sourceMappingURL=malaysian-rules.d.ts.map