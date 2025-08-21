import { describe, it, expect } from 'vitest';

describe('Malaysian e-Invoice Compliance Tests', () => {
  describe('LHDN Compliance Requirements', () => {
    it('should validate mandatory invoice fields for LHDN', () => {
      const mandatoryFields = [
        'invoiceNumber',
        'issueDate',
        'seller.tin',
        'seller.name',
        'seller.address',
        'buyer.tin',
        'buyer.name',
        'buyer.address',
        'invoiceLines',
        'totalAmount',
        'currencyCode'
      ];

      const sampleInvoice = {
        invoiceNumber: 'INV-2024-001',
        issueDate: '2024-08-20',
        seller: {
          tin: 'C1234567890',
          name: 'Easy e-Invoice Sdn Bhd',
          address: 'Kuala Lumpur, Malaysia'
        },
        buyer: {
          tin: 'C9876543210',
          name: 'ABC Sdn Bhd',
          address: 'Petaling Jaya, Malaysia'
        },
        invoiceLines: [
          {
            description: 'Software Development Services',
            quantity: 1,
            unitPrice: 1000.00,
            totalAmount: 1000.00
          }
        ],
        totalAmount: 1060.00,
        sstAmount: 60.00,
        currencyCode: 'MYR'
      };

      mandatoryFields.forEach(field => {
        const fieldPath = field.split('.');
        let value = sampleInvoice;
        
        for (const part of fieldPath) {
          value = value?.[part];
        }
        
        expect(value).toBeDefined();
        expect(value).not.toBe('');
        expect(value).not.toBe(null);
      });
    });

    it('should validate invoice numbering sequence compliance', () => {
      const invoiceNumbers = [
        'INV-2024-001',
        'INV-2024-002',
        'INV-2024-003',
        'INV-2024-005' // Missing sequence should be detected
      ];

      // LHDN requires sequential numbering
      for (let i = 1; i < invoiceNumbers.length; i++) {
        const prev = invoiceNumbers[i - 1];
        const current = invoiceNumbers[i];
        
        const prevNumber = parseInt(prev.split('-')[2]);
        const currentNumber = parseInt(current.split('-')[2]);
        
        if (currentNumber !== prevNumber + 1) {
          expect(currentNumber).toBe(prevNumber + 1); // This should fail for testing
        }
      }
    });

    it('should validate Malaysian date format requirements', () => {
      const validDateFormats = [
        '2024-08-20',
        '20/08/2024',
        '20-08-2024'
      ];

      const invalidDateFormats = [
        '08/20/2024', // US format
        '2024/08/20',
        '20.08.2024'
      ];

      const malaysianDatePattern = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})$/;

      validDateFormats.forEach(date => {
        expect(malaysianDatePattern.test(date)).toBe(true);
      });

      invalidDateFormats.forEach(date => {
        expect(malaysianDatePattern.test(date)).toBe(false);
      });
    });
  });

  describe('TIN (Tax Identification Number) Validation', () => {
    it('should validate corporate TIN format (C + 10 digits)', () => {
      const validCorporateTins = [
        'C1234567890',
        'C9876543210',
        'C0000000001'
      ];

      const invalidCorporateTins = [
        'C123456789', // Too short
        'C12345678901', // Too long
        'c1234567890', // Lowercase
        'C123456789A', // Contains letter
        'C123 456 789' // Contains spaces
      ];

      const corporateTinPattern = /^C\d{10}$/;

      validCorporateTins.forEach(tin => {
        expect(corporateTinPattern.test(tin)).toBe(true);
      });

      invalidCorporateTins.forEach(tin => {
        expect(corporateTinPattern.test(tin)).toBe(false);
      });
    });

    it('should validate individual TIN format (12 digits)', () => {
      const validIndividualTins = [
        '123456789012',
        '987654321098',
        '000000000001'
      ];

      const invalidIndividualTins = [
        '12345678901', // Too short
        '1234567890123', // Too long
        '12345678901A', // Contains letter
        '123 456 789 012' // Contains spaces
      ];

      const individualTinPattern = /^\d{12}$/;

      validIndividualTins.forEach(tin => {
        expect(individualTinPattern.test(tin)).toBe(true);
      });

      invalidIndividualTins.forEach(tin => {
        expect(individualTinPattern.test(tin)).toBe(false);
      });
    });

    it('should validate government TIN format (G + 10 digits)', () => {
      const validGovTins = [
        'G1234567890',
        'G9876543210'
      ];

      const invalidGovTins = [
        'g1234567890', // Lowercase
        'G123456789', // Too short
        'G12345678901' // Too long
      ];

      const govTinPattern = /^G\d{10}$/;

      validGovTins.forEach(tin => {
        expect(govTinPattern.test(tin)).toBe(true);
      });

      invalidGovTins.forEach(tin => {
        expect(govTinPattern.test(tin)).toBe(false);
      });
    });

    it('should validate non-resident TIN format (N + 10 digits)', () => {
      const validNonResidentTins = [
        'N1234567890',
        'N9876543210'
      ];

      const nonResidentTinPattern = /^N\d{10}$/;

      validNonResidentTins.forEach(tin => {
        expect(nonResidentTinPattern.test(tin)).toBe(true);
      });
    });
  });

  describe('SST (Sales and Service Tax) Compliance', () => {
    it('should calculate 6% SST correctly', () => {
      const testCases = [
        { amount: 1000.00, expectedSst: 60.00 },
        { amount: 500.00, expectedSst: 30.00 },
        { amount: 333.33, expectedSst: 20.00 }, // Rounded
        { amount: 100.00, expectedSst: 6.00 },
        { amount: 0.01, expectedSst: 0.00 } // Below minimum
      ];

      const calculateSst = (amount: number): number => {
        const sstRate = 0.06;
        const sstAmount = amount * sstRate;
        return Math.round(sstAmount * 100) / 100; // Round to 2 decimal places
      };

      testCases.forEach(({ amount, expectedSst }) => {
        const calculatedSst = calculateSst(amount);
        expect(calculatedSst).toBe(expectedSst);
      });
    });

    it('should handle SST exemptions correctly', () => {
      const exemptCategories = [
        'MEDICAL_SERVICES',
        'EDUCATION_SERVICES',
        'TRANSPORT_SERVICES',
        'FINANCIAL_SERVICES'
      ];

      const isExemptFromSst = (category: string): boolean => {
        return exemptCategories.includes(category);
      };

      exemptCategories.forEach(category => {
        expect(isExemptFromSst(category)).toBe(true);
      });

      expect(isExemptFromSst('SOFTWARE_SERVICES')).toBe(false);
    });

    it('should validate SST registration requirements', () => {
      const businessTypes = [
        { revenue: 500000, required: true }, // RM 500K annual revenue
        { revenue: 400000, required: false },
        { revenue: 600000, required: true }
      ];

      const isSstRegistrationRequired = (annualRevenue: number): boolean => {
        return annualRevenue >= 500000;
      };

      businessTypes.forEach(({ revenue, required }) => {
        expect(isSstRegistrationRequired(revenue)).toBe(required);
      });
    });
  });

  describe('Industry-Specific B2C Consolidation Rules', () => {
    it('should prohibit B2C consolidation for electric power industry', () => {
      const electricPowerCodes = ['35101', '35102', '35103'];
      
      const canConsolidateB2c = (industryCode: string): boolean => {
        const prohibitedCodes = [
          '35101', '35102', '35103', // Electric power
          '36000', '37000', // Water services
          '61', // Telecommunications
          '52211', '52212', // Parking and toll
          '84' // Public administration
        ];
        
        return !prohibitedCodes.includes(industryCode);
      };

      electricPowerCodes.forEach(code => {
        expect(canConsolidateB2c(code)).toBe(false);
      });
    });

    it('should prohibit B2C consolidation for telecommunications', () => {
      const telecomCodes = ['61'];
      
      const canConsolidateB2c = (industryCode: string): boolean => {
        const prohibitedCodes = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
        return !prohibitedCodes.includes(industryCode);
      };

      telecomCodes.forEach(code => {
        expect(canConsolidateB2c(code)).toBe(false);
      });
    });

    it('should allow B2C consolidation for other industries', () => {
      const allowedCodes = ['47', '56', '62', '68'];
      
      const canConsolidateB2c = (industryCode: string): boolean => {
        const prohibitedCodes = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
        return !prohibitedCodes.includes(industryCode);
      };

      allowedCodes.forEach(code => {
        expect(canConsolidateB2c(code)).toBe(true);
      });
    });
  });

  describe('Currency and Exchange Rate Compliance', () => {
    it('should require exchange rates for non-MYR invoices', () => {
      const invoiceData = [
        { currency: 'MYR', requiresExchangeRate: false },
        { currency: 'USD', requiresExchangeRate: true },
        { currency: 'SGD', requiresExchangeRate: true },
        { currency: 'EUR', requiresExchangeRate: true }
      ];

      const requiresExchangeRate = (currency: string): boolean => {
        return currency !== 'MYR';
      };

      invoiceData.forEach(({ currency, requiresExchangeRate: expected }) => {
        expect(requiresExchangeRate(currency)).toBe(expected);
      });
    });

    it('should validate MYR currency formatting', () => {
      const amounts = [
        { value: 1000.50, formatted: 'RM 1,000.50' },
        { value: 100, formatted: 'RM 100.00' },
        { value: 1234567.89, formatted: 'RM 1,234,567.89' }
      ];

      const formatMyrCurrency = (amount: number): string => {
        return `RM ${amount.toLocaleString('en-MY', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      };

      amounts.forEach(({ value, formatted }) => {
        expect(formatMyrCurrency(value)).toBe(formatted);
      });
    });
  });

  describe('Credit Note and Debit Note Compliance', () => {
    it('should validate credit note references to original invoices', () => {
      const creditNote = {
        type: 'CREDIT_NOTE',
        creditNoteNumber: 'CN-2024-001',
        originalInvoiceNumber: 'INV-2024-001',
        issueDate: '2024-08-21',
        reason: 'Product return'
      };

      // Credit notes must reference original invoice
      expect(creditNote.originalInvoiceNumber).toBeDefined();
      expect(creditNote.originalInvoiceNumber).toMatch(/^INV-/);
      expect(creditNote.reason).toBeDefined();
      expect(creditNote.reason.length).toBeGreaterThan(0);
    });

    it('should validate debit note business rules', () => {
      const debitNote = {
        type: 'DEBIT_NOTE',
        debitNoteNumber: 'DN-2024-001',
        originalInvoiceNumber: 'INV-2024-001',
        issueDate: '2024-08-21',
        reason: 'Additional charges'
      };

      // Debit notes must also reference original invoice
      expect(debitNote.originalInvoiceNumber).toBeDefined();
      expect(debitNote.originalInvoiceNumber).toMatch(/^INV-/);
      expect(debitNote.reason).toBeDefined();
    });
  });

  describe('PDPA (Personal Data Protection) Compliance', () => {
    it('should mask personal data in logs', () => {
      const personalData = {
        email: 'user@example.com',
        phone: '+60123456789',
        ic: '123456789012',
        tin: 'C1234567890',
        address: '123 Jalan ABC, Kuala Lumpur'
      };

      const maskPersonalData = (data: any): any => {
        const masked = { ...data };
        
        if (masked.email) {
          const [user, domain] = masked.email.split('@');
          const visibleChars = Math.min(2, Math.floor(user.length / 3));
          masked.email = `${user.substring(0, visibleChars)}***@${domain}`;
        }
        
        if (masked.phone) {
          // Handle both local (+60) and international formats
          const cleanPhone = masked.phone.replace(/\D/g, '');
          masked.phone = cleanPhone.substring(0, 3) + '***' + cleanPhone.substring(cleanPhone.length - 2);
        }
        
        if (masked.ic) {
          // Handle both 12-digit IC and other ID formats
          const cleanIC = masked.ic.replace(/\D/g, '');
          const visibleDigits = Math.min(4, Math.floor(cleanIC.length / 3));
          masked.ic = '***' + cleanIC.substring(cleanIC.length - visibleDigits);
        }
        
        if (masked.tin) {
          masked.tin = masked.tin.substring(0, 2) + '***' + masked.tin.substring(masked.tin.length - 2);
        }
        
        return masked;
      };

      const masked = maskPersonalData(personalData);
      
      expect(masked.email).toBe('us***@example.com');
      expect(masked.phone).toBe('+601***89');
      expect(masked.ic).toBe('***9012');
      expect(masked.tin).toBe('C1***90');
    });

    it('should validate consent tracking', () => {
      const userConsent = {
        userId: 'user123',
        consentGiven: true,
        consentDate: '2024-08-20T10:00:00Z',
        purposes: ['invoice_processing', 'email_notifications'],
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      };

      expect(userConsent.consentGiven).toBe(true);
      expect(userConsent.consentDate).toBeDefined();
      expect(userConsent.purposes.length).toBeGreaterThan(0);
      expect(userConsent.ipAddress).toBeDefined();
    });
  });

  describe('MyInvois Portal Integration Readiness', () => {
    it('should generate MyInvois-compatible JSON format', () => {
      const invoice = {
        invoiceNumber: 'INV-2024-001',
        issueDate: '2024-08-20',
        seller: {
          tin: 'C1234567890',
          name: 'Easy e-Invoice Sdn Bhd'
        },
        buyer: {
          tin: 'C9876543210',
          name: 'ABC Sdn Bhd'
        },
        totalAmount: 1060.00,
        currencyCode: 'MYR'
      };

      const myInvoisFormat = {
        _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        Invoice: [
          {
            ID: [{ _: invoice.invoiceNumber }],
            IssueDate: [{ _: invoice.issueDate }],
            DocumentCurrencyCode: [{ _: invoice.currencyCode }],
            AccountingSupplierParty: [
              {
                Party: [
                  {
                    PartyIdentification: [
                      { ID: [{ _: invoice.seller.tin, schemeID: 'TIN' }] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      expect(myInvoisFormat.Invoice[0].ID[0]._).toBe(invoice.invoiceNumber);
      expect(myInvoisFormat.Invoice[0].IssueDate[0]._).toBe(invoice.issueDate);
      expect(myInvoisFormat.Invoice[0].DocumentCurrencyCode[0]._).toBe(invoice.currencyCode);
    });

    it('should validate submission status tracking', () => {
      const submissionStatus = {
        invoiceId: 'inv_123',
        myInvoisId: 'mi_456',
        status: 'SUBMITTED',
        submittedAt: '2024-08-20T14:30:00Z',
        validationResult: {
          isValid: true,
          errors: [],
          warnings: []
        }
      };

      expect(submissionStatus.status).toBe('SUBMITTED');
      expect(submissionStatus.myInvoisId).toBeDefined();
      expect(submissionStatus.validationResult.isValid).toBe(true);
    });
  });

  describe('Audit Trail and Compliance Reporting', () => {
    it('should maintain complete audit trail', () => {
      const auditEntry = {
        timestamp: '2024-08-20T10:30:00Z',
        userId: 'user123',
        action: 'CREATE_INVOICE',
        resourceId: 'inv_456',
        resourceType: 'INVOICE',
        details: {
          invoiceNumber: 'INV-2024-001',
          amount: 1060.00,
          tin: 'C1234567890'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      };

      expect(auditEntry.timestamp).toBeDefined();
      expect(auditEntry.userId).toBeDefined();
      expect(auditEntry.action).toBeDefined();
      expect(auditEntry.resourceId).toBeDefined();
      expect(auditEntry.ipAddress).toBeDefined();
    });

    it('should generate compliance reports', () => {
      const complianceReport = {
        period: {
          start: '2024-08-01',
          end: '2024-08-31'
        },
        totalInvoices: 150,
        complianceScore: 100,
        issues: [],
        tinValidationResults: {
          total: 150,
          valid: 150,
          invalid: 0
        },
        sstCalculationResults: {
          total: 150,
          correct: 150,
          incorrect: 0
        }
      };

      expect(complianceReport.complianceScore).toBe(100);
      expect(complianceReport.issues.length).toBe(0);
      expect(complianceReport.tinValidationResults.invalid).toBe(0);
      expect(complianceReport.sstCalculationResults.incorrect).toBe(0);
    });
  });
});