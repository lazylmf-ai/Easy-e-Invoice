// Define minimal interfaces to avoid circular dependencies
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

export const MALAYSIAN_VALIDATION_RULES: ValidationRule[] = [
  {
    code: 'MY-001',
    severity: 'error',
    field: 'supplier.tin',
    message: 'Malaysian TIN format invalid',
    fixHint: 'Use format C1234567890 or 123456789012',
    check: (invoice, lines, org) => {
      return /^[A-Z]\d{10}$|^\d{12}$/.test(org.tin);
    }
  },
  
  {
    code: 'MY-002',
    severity: 'error',
    field: 'line_items[].sst_amount',
    message: 'SST calculation incorrect',
    fixHint: 'SST Amount = Line Total × SST Rate ÷ 100',
    check: (invoice, lines, org) => {
      return lines.every(line => {
        const expectedSst = (parseFloat(line.lineTotal) * parseFloat(line.sstRate)) / 100;
        const actualSst = parseFloat(line.sstAmount);
        return Math.abs(actualSst - expectedSst) < 0.01;
      });
    }
  },
  
  {
    code: 'MY-003',
    severity: 'error',
    field: 'invoice.is_consolidated',
    message: 'Industry not eligible for B2C consolidation',
    fixHint: 'Issue individual invoices for utilities, telecom, government sectors',
    check: (invoice, lines, org) => {
      const prohibitedIndustries = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
      return !invoice.isConsolidated || !prohibitedIndustries.includes(org.industryCode || '');
    }
  },
  
  {
    code: 'MY-004',
    severity: 'error',
    field: 'invoice.exchange_rate',
    message: 'Exchange rate required for non-MYR invoices',
    fixHint: 'Provide Bank Negara Malaysia reference rate',
    check: (invoice, lines, org) => {
      return invoice.currency === 'MYR' || parseFloat(invoice.exchangeRate) > 0;
    }
  },
  
  {
    code: 'MY-005',
    severity: 'error',
    field: 'invoice.reference_invoice_id',
    message: 'Credit note must reference original invoice',
    fixHint: 'Provide original invoice number being credited',
    check: (invoice, lines, org) => {
      return invoice.eInvoiceType !== '02' || invoice.referenceInvoiceId !== null;
    }
  }
];

export interface ValidationResult {
  ruleCode: string;
  severity: 'error' | 'warning' | 'info';
  fieldPath: string;
  message: string;
  fixSuggestion: string;
  isResolved: boolean;
}

export function validateInvoice(
  invoice: Invoice,
  lines: InvoiceLine[],
  org: Organization
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const rule of MALAYSIAN_VALIDATION_RULES) {
    try {
      const isValid = rule.check(invoice, lines, org);
      
      if (!isValid) {
        results.push({
          ruleCode: rule.code,
          severity: rule.severity,
          fieldPath: rule.field,
          message: rule.message,
          fixSuggestion: rule.fixHint,
          isResolved: false,
        });
      }
    } catch (error) {
      // Log error but don't fail validation
      console.error(`Validation rule ${rule.code} failed:`, error);
    }
  }
  
  return results;
}

export function calculateValidationScore(results: ValidationResult[]): number {
  if (results.length === 0) return 100;
  
  const totalRules = MALAYSIAN_VALIDATION_RULES.length;
  const failedErrors = results.filter(r => r.severity === 'error').length;
  const failedWarnings = results.filter(r => r.severity === 'warning').length;
  
  // Errors are weighted more heavily than warnings
  const errorWeight = 10;
  const warningWeight = 3;
  
  const totalDeductions = (failedErrors * errorWeight) + (failedWarnings * warningWeight);
  const maxPossibleDeductions = totalRules * errorWeight;
  
  const score = Math.max(0, Math.round(100 - (totalDeductions / maxPossibleDeductions) * 100));
  return score;
}

// B2C consolidation specific rules
export const B2C_CONSOLIDATION_RULES = {
  // Completely prohibited industries
  prohibited: [
    '35101', // Electric power generation
    '35102', // Electric power transmission
    '35103', // Electric power distribution
    '36000', // Water collection/treatment/supply
    '37000', // Sewerage services
    '61',    // Telecommunications
    '52211', // Parking services
    '52212', // Toll road operations
    '84'     // Public administration
  ],
  
  // Conditional restrictions
  conditional: {
    '47': { // Retail trade
      maxTransactions: 200,
      warning: 'Retail consolidation recommended max 200 transactions/month'
    },
    '56': { // Food and beverage services
      maxAmount: 50000,
      warning: 'F&B consolidation recommended max RM50,000/month'
    }
  },
  
  // Validation function
  validateConsolidation(invoice: Invoice, org: Organization, lineCount: number): {
    allowed: boolean;
    reason?: string;
    action?: string;
  } {
    // Check prohibited industries
    if (this.prohibited.includes(org.industryCode || '')) {
      return {
        allowed: false,
        reason: 'Industry not eligible for consolidation',
        action: 'Issue individual invoices for each transaction'
      };
    }
    
    // Check conditional restrictions
    const condition = this.conditional[org.industryCode as keyof typeof this.conditional];
    if (condition) {
      if ('maxTransactions' in condition && lineCount > condition.maxTransactions) {
        return {
          allowed: false,
          reason: condition.warning,
          action: 'Consider splitting into multiple consolidated invoices'
        };
      }
    }
    
    return { allowed: true };
  }
};