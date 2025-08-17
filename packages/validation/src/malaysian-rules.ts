import { validateTinFormat } from './tin-validation';
import { getIndustryCode, isB2cConsolidationAllowed } from './industry-codes';
import type { Invoice, InvoiceLine, CompleteInvoice } from './invoice-schemas';

// Organization interface for validation
interface Organization {
  tin: string;
  industryCode?: string | null;
  isSstRegistered?: boolean;
}

// Party interface for validation
interface Party {
  tin: string;
  name: string;
}

export interface ValidationRule {
  code: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  fixHint: string;
  check: (invoice: Invoice, lines: InvoiceLine[], org: Organization, buyer?: Party) => boolean;
}

export const MALAYSIAN_VALIDATION_RULES: ValidationRule[] = [
  {
    code: 'MY-001',
    severity: 'error',
    field: 'supplier.tin',
    message: 'Supplier TIN format invalid',
    fixHint: 'Use format C1234567890 (corporate) or 123456789012 (individual)',
    check: (invoice, lines, org, buyer) => {
      const validation = validateTinFormat(org.tin);
      return validation.isValid;
    }
  },
  
  {
    code: 'MY-002',
    severity: 'error',
    field: 'buyer.tin',
    message: 'Buyer TIN format invalid',
    fixHint: 'Use format C1234567890 (corporate) or 123456789012 (individual)',
    check: (invoice, lines, org, buyer) => {
      if (!buyer?.tin) return true; // Optional for B2C consolidated
      const validation = validateTinFormat(buyer.tin);
      return validation.isValid;
    }
  },
  
  {
    code: 'MY-003',
    severity: 'error',
    field: 'line_items[].sst_amount',
    message: 'SST calculation incorrect',
    fixHint: 'SST Amount = Line Total × SST Rate ÷ 100',
    check: (invoice, lines, org, buyer) => {
      return lines.every(line => {
        const expectedSst = (parseFloat(line.lineTotal) * parseFloat(line.sstRate)) / 100;
        const actualSst = parseFloat(line.sstAmount);
        return Math.abs(actualSst - expectedSst) < 0.01;
      });
    }
  },
  
  {
    code: 'MY-004',
    severity: 'error',
    field: 'invoice.is_consolidated',
    message: 'Industry not eligible for B2C consolidation',
    fixHint: 'Issue individual invoices for utilities, telecom, government sectors',
    check: (invoice, lines, org, buyer) => {
      if (!invoice.isConsolidated) return true;
      const consolidationCheck = isB2cConsolidationAllowed(org.industryCode || '');
      return consolidationCheck.allowed;
    }
  },
  
  {
    code: 'MY-005',
    severity: 'error',
    field: 'invoice.exchange_rate',
    message: 'Exchange rate required for non-MYR invoices',
    fixHint: 'Provide Bank Negara Malaysia reference rate (6 decimal places)',
    check: (invoice, lines, org, buyer) => {
      return invoice.currency === 'MYR' || parseFloat(invoice.exchangeRate) !== 1.0;
    }
  },
  
  {
    code: 'MY-006',
    severity: 'error',
    field: 'invoice.reference_invoice_id',
    message: 'Credit/Debit note must reference original invoice',
    fixHint: 'Provide original invoice ID or number for credit/debit notes',
    check: (invoice, lines, org, buyer) => {
      const requiresReference = ['02', '03'].includes(invoice.eInvoiceType);
      return !requiresReference || !!invoice.referenceInvoiceId;
    }
  },
  
  {
    code: 'MY-007',
    severity: 'error',
    field: 'invoice.buyer_required',
    message: 'Buyer information required for non-consolidated invoices',
    fixHint: 'Provide buyer details or mark invoice as consolidated for B2C',
    check: (invoice, lines, org, buyer) => {
      return invoice.isConsolidated || !!buyer;
    }
  },
  
  {
    code: 'MY-008',
    severity: 'warning',
    field: 'line_items[].sst_rate',
    message: 'SST rate applied but organization not SST registered',
    fixHint: 'Register for SST or remove SST charges',
    check: (invoice, lines, org, buyer) => {
      const hasSST = lines.some(line => parseFloat(line.sstRate) > 0);
      return !hasSST || !!org.isSstRegistered;
    }
  },
  
  {
    code: 'MY-009',
    severity: 'warning',
    field: 'invoice.consolidation_period',
    message: 'Consolidation period should match issue date month',
    fixHint: 'Set consolidation period to YYYY-MM format matching issue date',
    check: (invoice, lines, org, buyer) => {
      if (!invoice.isConsolidated || !invoice.consolidationPeriod) return true;
      const issueMonth = invoice.issueDate.substring(0, 7); // YYYY-MM
      return invoice.consolidationPeriod === issueMonth;
    }
  },
  
  {
    code: 'MY-010',
    severity: 'warning',
    field: 'invoice.due_date',
    message: 'Due date should be within reasonable payment terms',
    fixHint: 'Set due date within 30-90 days of issue date',
    check: (invoice, lines, org, buyer) => {
      if (!invoice.dueDate) return true;
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);
      const daysDiff = Math.ceil((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 90;
    }
  },
  
  {
    code: 'MY-011',
    severity: 'info',
    field: 'invoice.currency',
    message: 'Foreign currency invoice detected',
    fixHint: 'Ensure exchange rate is from Bank Negara Malaysia on issue date',
    check: (invoice, lines, org, buyer) => {
      return invoice.currency === 'MYR';
    }
  },
  
  {
    code: 'MY-012',
    severity: 'info',
    field: 'line_items[].quantity',
    message: 'High quantity detected',
    fixHint: 'Verify quantity is correct for bulk transactions',
    check: (invoice, lines, org, buyer) => {
      return lines.every(line => parseFloat(line.quantity) <= 10000);
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
  org: Organization,
  buyer?: Party
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const rule of MALAYSIAN_VALIDATION_RULES) {
    try {
      const isValid = rule.check(invoice, lines, org, buyer);
      
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

export function validateCompleteInvoice(
  completeInvoice: CompleteInvoice,
  org: Organization
): ValidationResult[] {
  return validateInvoice(
    completeInvoice.invoice,
    completeInvoice.lineItems,
    org,
    completeInvoice.buyer
  );
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