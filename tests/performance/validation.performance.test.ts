import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Validation Performance Tests', () => {
  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    singleValidation: 50,      // < 50ms per invoice
    batchValidation: 5000,     // < 5s for 1000 invoices
    tinValidation: 1,          // < 1ms per TIN
    sstCalculation: 0.1,       // < 0.1ms per calculation
    consolidationCheck: 5,     // < 5ms per check
    complexValidation: 100,    // < 100ms for full rule set
  };

  // Mock validation functions (simulating the actual validation package)
  const mockValidateTinFormat = (tin: string): { isValid: boolean; type: string; errors: string[] } => {
    const patterns = {
      corporate: /^C\d{10}$/,
      individual: /^\d{12}$/,
      government: /^G\d{10}$/,
      nonprofit: /^N\d{10}$/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(tin)) {
        return { isValid: true, type, errors: [] };
      }
    }
    
    return { 
      isValid: false, 
      type: 'unknown', 
      errors: ['Invalid TIN format'] 
    };
  };

  const mockValidateSstCalculation = (lineTotal: number, sstRate: number, sstAmount: number): boolean => {
    const expectedSst = Math.round((lineTotal * sstRate / 100) * 100) / 100;
    return Math.abs(sstAmount - expectedSst) < 0.01;
  };

  const mockValidateConsolidation = (industryCode: string, isConsolidated: boolean): { allowed: boolean; reason?: string } => {
    const prohibitedIndustries = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
    
    if (!isConsolidated) {
      return { allowed: true };
    }
    
    if (prohibitedIndustries.includes(industryCode)) {
      return { allowed: false, reason: 'Industry not eligible for consolidation' };
    }
    
    return { allowed: true };
  };

  const mockValidateExchangeRate = (currency: string, exchangeRate: number): boolean => {
    if (currency === 'MYR') {
      return exchangeRate === 1.0;
    }
    return exchangeRate > 1.0;
  };

  const mockValidateInvoice = (invoice: any, lineItems: any[], organization: any): any[] => {
    const results = [];
    
    // TIN validation
    const tinValidation = mockValidateTinFormat(organization.tin);
    if (!tinValidation.isValid) {
      results.push({
        ruleCode: 'MY-001',
        severity: 'error',
        fieldPath: 'supplier.tin',
        message: 'Supplier TIN format invalid'
      });
    }
    
    // SST calculations
    for (const line of lineItems) {
      if (!mockValidateSstCalculation(line.lineTotal, line.sstRate, line.sstAmount)) {
        results.push({
          ruleCode: 'MY-003',
          severity: 'error',
          fieldPath: 'line_items[].sst_amount',
          message: 'SST calculation incorrect'
        });
      }
    }
    
    // Consolidation check
    const consolidationCheck = mockValidateConsolidation(organization.industryCode, invoice.isConsolidated);
    if (!consolidationCheck.allowed) {
      results.push({
        ruleCode: 'MY-004',
        severity: 'error',
        fieldPath: 'invoice.is_consolidated',
        message: 'Industry not eligible for B2C consolidation'
      });
    }
    
    // Exchange rate validation
    if (!mockValidateExchangeRate(invoice.currency, parseFloat(invoice.exchangeRate))) {
      results.push({
        ruleCode: 'MY-005',
        severity: 'error',
        fieldPath: 'invoice.exchange_rate',
        message: 'Exchange rate required for non-MYR invoices'
      });
    }
    
    return results;
  };

  // Test data generators
  const generateTestInvoice = (overrides = {}) => ({
    invoiceNumber: 'INV-PERF-001',
    eInvoiceType: '01',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    currency: 'MYR',
    exchangeRate: '1.000000',
    isConsolidated: false,
    subtotal: '1000.00',
    totalDiscount: '0.00',
    sstAmount: '60.00',
    grandTotal: '1060.00',
    status: 'draft',
    validationScore: 0,
    notes: 'Performance test invoice',
    ...overrides
  });

  const generateTestLineItem = (overrides = {}) => ({
    lineNumber: 1,
    itemDescription: 'Performance Test Service',
    quantity: 1,
    unitPrice: 1000.00,
    discountAmount: 0.00,
    lineTotal: 1000.00,
    sstRate: 6.00,
    sstAmount: 60.00,
    ...overrides
  });

  const generateTestOrganization = (overrides = {}) => ({
    tin: 'C1234567890',
    industryCode: '62010',
    isSstRegistered: true,
    ...overrides
  });

  describe('Individual Validation Rule Performance', () => {
    it('should validate TIN format efficiently', async () => {
      const testTins = [
        'C1234567890',  // Valid corporate
        '123456789012', // Valid individual
        'G1234567890',  // Valid government
        'N1234567890',  // Valid nonprofit
        'INVALID123',   // Invalid format
        '12345',        // Too short
        'C123456789012345', // Too long
      ];
      
      const iterations = 10000;
      const startTime = performance.now();
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        const tin = testTins[i % testTins.length];
        const result = mockValidateTinFormat(tin);
        
        if (result.isValid) validCount++;
        else invalidCount++;
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerValidation = duration / iterations;
      
      console.log(`TIN Validation Performance:
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per validation: ${avgTimePerValidation.toFixed(3)}ms
        Validations per second: ${(iterations / (duration / 1000)).toFixed(0)}
        Valid: ${validCount}, Invalid: ${invalidCount}`);
      
      expect(avgTimePerValidation).toBeLessThan(PERFORMANCE_THRESHOLDS.tinValidation);
      expect(iterations / (duration / 1000)).toBeGreaterThan(100000);
    });

    it('should calculate SST efficiently at scale', async () => {
      const iterations = 100000;
      const startTime = performance.now();
      
      let correctCalculations = 0;
      let incorrectCalculations = 0;
      
      for (let i = 0; i < iterations; i++) {
        const lineTotal = Math.random() * 10000 + 100;
        const sstRate = 6.0;
        const expectedSst = Math.round((lineTotal * sstRate / 100) * 100) / 100;
        
        // Add some intentional errors for testing
        const actualSst = i % 10 === 0 ? expectedSst + 0.1 : expectedSst;
        
        const isValid = mockValidateSstCalculation(lineTotal, sstRate, actualSst);
        
        if (isValid) correctCalculations++;
        else incorrectCalculations++;
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerCalculation = duration / iterations;
      
      console.log(`SST Calculation Performance:
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per calculation: ${avgTimePerCalculation.toFixed(4)}ms
        Calculations per second: ${(iterations / (duration / 1000)).toFixed(0)}
        Correct: ${correctCalculations}, Incorrect: ${incorrectCalculations}`);
      
      expect(avgTimePerCalculation).toBeLessThan(PERFORMANCE_THRESHOLDS.sstCalculation);
      expect(iterations / (duration / 1000)).toBeGreaterThan(1000000);
    });

    it('should validate industry consolidation rules efficiently', async () => {
      const testIndustries = [
        { code: '62010', consolidationAllowed: true },   // IT Services
        { code: '35101', consolidationAllowed: false },  // Electric power
        { code: '47', consolidationAllowed: true },      // Retail
        { code: '61', consolidationAllowed: false },     // Telecommunications
        { code: '84', consolidationAllowed: false },     // Public administration
      ];
      
      const iterations = 50000;
      const startTime = performance.now();
      
      let allowedCount = 0;
      let disallowedCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        const industry = testIndustries[i % testIndustries.length];
        const result = mockValidateConsolidation(industry.code, true);
        
        if (result.allowed) allowedCount++;
        else disallowedCount++;
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerCheck = duration / iterations;
      
      console.log(`Consolidation Validation Performance:
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per check: ${avgTimePerCheck.toFixed(3)}ms
        Checks per second: ${(iterations / (duration / 1000)).toFixed(0)}
        Allowed: ${allowedCount}, Disallowed: ${disallowedCount}`);
      
      expect(avgTimePerCheck).toBeLessThan(PERFORMANCE_THRESHOLDS.consolidationCheck);
    });
  });

  describe('Complete Invoice Validation Performance', () => {
    it('should validate single invoice efficiently', async () => {
      const invoice = generateTestInvoice();
      const lineItems = [generateTestLineItem()];
      const organization = generateTestOrganization();
      
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const results = mockValidateInvoice(invoice, lineItems, organization);
        // Simulate processing results
        const hasErrors = results.some(r => r.severity === 'error');
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerValidation = duration / iterations;
      
      console.log(`Single Invoice Validation Performance:
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per validation: ${avgTimePerValidation.toFixed(3)}ms
        Validations per second: ${(iterations / (duration / 1000)).toFixed(0)}`);
      
      expect(avgTimePerValidation).toBeLessThan(PERFORMANCE_THRESHOLDS.singleValidation);
    });

    it('should validate complex invoice with multiple line items efficiently', async () => {
      const invoice = generateTestInvoice();
      const lineItems = Array.from({ length: 20 }, (_, i) => 
        generateTestLineItem({
          lineNumber: i + 1,
          itemDescription: `Line item ${i + 1}`,
          quantity: Math.floor(Math.random() * 100) + 1,
          unitPrice: Math.random() * 1000 + 50,
          lineTotal: Math.random() * 2000 + 100,
          sstAmount: Math.random() * 120 + 6
        })
      );
      const organization = generateTestOrganization();
      
      const iterations = 500;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const results = mockValidateInvoice(invoice, lineItems, organization);
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerValidation = duration / iterations;
      
      console.log(`Complex Invoice Validation Performance:
        Line items: ${lineItems.length}
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per validation: ${avgTimePerValidation.toFixed(3)}ms
        Validations per second: ${(iterations / (duration / 1000)).toFixed(0)}`);
      
      expect(avgTimePerValidation).toBeLessThan(PERFORMANCE_THRESHOLDS.complexValidation);
    });

    it('should validate batch of invoices efficiently', async () => {
      const batchSize = 1000;
      const invoices = Array.from({ length: batchSize }, (_, i) => ({
        invoice: generateTestInvoice({ invoiceNumber: `INV-BATCH-${i + 1}` }),
        lineItems: [generateTestLineItem()],
        organization: generateTestOrganization()
      }));
      
      const startTime = performance.now();
      
      let totalValidationResults = 0;
      
      for (const { invoice, lineItems, organization } of invoices) {
        const results = mockValidateInvoice(invoice, lineItems, organization);
        totalValidationResults += results.length;
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerInvoice = duration / batchSize;
      
      console.log(`Batch Validation Performance:
        Batch size: ${batchSize}
        Duration: ${duration.toFixed(2)}ms (${(duration / 1000).toFixed(2)}s)
        Average per invoice: ${avgTimePerInvoice.toFixed(3)}ms
        Invoices per second: ${(batchSize / (duration / 1000)).toFixed(0)}
        Total validation results: ${totalValidationResults}`);
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchValidation);
      expect(avgTimePerInvoice).toBeLessThan(PERFORMANCE_THRESHOLDS.singleValidation);
    });
  });

  describe('Validation Under Load', () => {
    it('should maintain performance under concurrent validation requests', async () => {
      const concurrentBatches = 5;
      const invoicesPerBatch = 200;
      
      const batchPromises = Array.from({ length: concurrentBatches }, async (_, batchIndex) => {
        const invoices = Array.from({ length: invoicesPerBatch }, (_, i) => ({
          invoice: generateTestInvoice({ 
            invoiceNumber: `INV-CONCURRENT-${batchIndex}-${i + 1}`,
            currency: i % 3 === 0 ? 'USD' : 'MYR',
            exchangeRate: i % 3 === 0 ? '4.350000' : '1.000000'
          }),
          lineItems: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, lineIndex) =>
            generateTestLineItem({ lineNumber: lineIndex + 1 })
          ),
          organization: generateTestOrganization({
            industryCode: ['62010', '35101', '47', '61'][i % 4]
          })
        }));
        
        const batchStartTime = performance.now();
        
        for (const { invoice, lineItems, organization } of invoices) {
          mockValidateInvoice(invoice, lineItems, organization);
        }
        
        return {
          batchIndex,
          duration: performance.now() - batchStartTime,
          invoiceCount: invoicesPerBatch
        };
      });
      
      const startTime = performance.now();
      const results = await Promise.all(batchPromises);
      const totalTime = performance.now() - startTime;
      
      const totalInvoices = results.reduce((sum, r) => sum + r.invoiceCount, 0);
      const avgBatchTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxBatchTime = Math.max(...results.map(r => r.duration));
      
      console.log(`Concurrent Validation Performance:
        Concurrent batches: ${concurrentBatches}
        Total invoices: ${totalInvoices}
        Total time: ${totalTime.toFixed(2)}ms
        Average batch time: ${avgBatchTime.toFixed(2)}ms
        Max batch time: ${maxBatchTime.toFixed(2)}ms
        Overall throughput: ${(totalInvoices / (totalTime / 1000)).toFixed(0)} invoices/second`);
      
      expect(maxBatchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchValidation);
      expect(totalInvoices / (totalTime / 1000)).toBeGreaterThan(500);
    });

    it('should handle validation of invoices with errors efficiently', async () => {
      const errorTypes = [
        { type: 'invalidTin', generate: () => ({ tin: 'INVALID123' }) },
        { type: 'wrongSst', generate: () => ({ 
          lineItems: [{ ...generateTestLineItem(), sstAmount: 50.00 }] // Should be 60.00
        }) },
        { type: 'badConsolidation', generate: () => ({ 
          invoice: { ...generateTestInvoice(), isConsolidated: true },
          organization: { ...generateTestOrganization(), industryCode: '35101' }
        }) },
        { type: 'wrongExchange', generate: () => ({ 
          invoice: { ...generateTestInvoice(), currency: 'USD', exchangeRate: '1.000000' }
        }) }
      ];
      
      const iterations = 2000;
      const startTime = performance.now();
      
      let totalErrors = 0;
      
      for (let i = 0; i < iterations; i++) {
        const errorType = errorTypes[i % errorTypes.length];
        const testData = errorType.generate();
        
        const invoice = testData.invoice || generateTestInvoice();
        const lineItems = testData.lineItems || [generateTestLineItem()];
        const organization = testData.organization || generateTestOrganization(testData);
        
        const results = mockValidateInvoice(invoice, lineItems, organization);
        totalErrors += results.length;
      }
      
      const duration = performance.now() - startTime;
      const avgTimePerValidation = duration / iterations;
      
      console.log(`Error Validation Performance:
        Iterations: ${iterations}
        Duration: ${duration.toFixed(2)}ms
        Average per validation: ${avgTimePerValidation.toFixed(3)}ms
        Total errors found: ${totalErrors}
        Error rate: ${(totalErrors / iterations).toFixed(2)} errors/invoice`);
      
      expect(avgTimePerValidation).toBeLessThan(PERFORMANCE_THRESHOLDS.singleValidation);
      expect(totalErrors).toBeGreaterThan(iterations); // Should find multiple errors
    });
  });

  describe('Memory Usage During Validation', () => {
    it('should maintain efficient memory usage during large batch validation', async () => {
      const batchSize = 5000;
      const memorySnapshots: number[] = [];
      
      // Monitor memory usage
      const monitorMemory = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / 1024 / 1024);
      }, 100);
      
      const startMemory = process.memoryUsage().heapUsed;
      
      // Process large batch
      for (let i = 0; i < batchSize; i++) {
        const invoice = generateTestInvoice({ invoiceNumber: `INV-MEM-${i + 1}` });
        const lineItems = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) =>
          generateTestLineItem({ lineNumber: j + 1 })
        );
        const organization = generateTestOrganization();
        
        mockValidateInvoice(invoice, lineItems, organization);
        
        // Simulate cleanup every 100 iterations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      clearInterval(monitorMemory);
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (endMemory - startMemory) / 1024 / 1024;
      const maxMemory = Math.max(...memorySnapshots);
      const avgMemory = memorySnapshots.reduce((sum, m) => sum + m, 0) / memorySnapshots.length;
      
      console.log(`Memory Usage Analysis:
        Batch size: ${batchSize}
        Memory delta: ${memoryDelta.toFixed(2)}MB
        Peak memory: ${maxMemory.toFixed(2)}MB
        Average memory: ${avgMemory.toFixed(2)}MB
        Memory per validation: ${((memoryDelta * 1024) / batchSize).toFixed(2)}KB`);
      
      // Memory delta should be reasonable
      expect(memoryDelta).toBeLessThan(50);
      expect(maxMemory).toBeLessThan(200);
    });
  });

  describe('Validation Caching Performance', () => {
    it('should benefit from TIN validation caching', async () => {
      const tinCache = new Map<string, any>();
      const testTins = ['C1234567890', 'C9876543210', '123456789012', 'G1111111111', 'N2222222222'];
      
      const cachedValidateTin = (tin: string) => {
        if (tinCache.has(tin)) {
          return tinCache.get(tin);
        }
        
        const result = mockValidateTinFormat(tin);
        tinCache.set(tin, result);
        return result;
      };
      
      const iterations = 10000;
      
      // Without cache
      const noCacheStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const tin = testTins[i % testTins.length];
        mockValidateTinFormat(tin);
      }
      const noCacheDuration = performance.now() - noCacheStart;
      
      // With cache
      const cacheStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const tin = testTins[i % testTins.length];
        cachedValidateTin(tin);
      }
      const cacheDuration = performance.now() - cacheStart;
      
      const improvementRatio = noCacheDuration / cacheDuration;
      
      console.log(`TIN Validation Caching Performance:
        Iterations: ${iterations}
        Unique TINs: ${testTins.length}
        Without cache: ${noCacheDuration.toFixed(2)}ms
        With cache: ${cacheDuration.toFixed(2)}ms
        Improvement: ${improvementRatio.toFixed(2)}x faster
        Cache hit rate: ${((iterations - testTins.length) / iterations * 100).toFixed(1)}%`);
      
      expect(improvementRatio).toBeGreaterThan(2);
      expect(tinCache.size).toBe(testTins.length);
    });
  });
});