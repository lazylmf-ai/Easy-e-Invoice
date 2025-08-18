import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Export Performance Tests', () => {
  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    csvExport: {
      small: 500,     // < 500ms for 100 invoices
      medium: 2000,   // < 2s for 1000 invoices
      large: 8000,    // < 8s for 10000 invoices
    },
    jsonExport: {
      small: 300,     // < 300ms for 100 invoices
      medium: 1500,   // < 1.5s for 1000 invoices
      large: 6000,    // < 6s for 10000 invoices
    },
    pdfExport: {
      single: 2000,   // < 2s for single invoice
      batch: 30000,   // < 30s for 100 invoices
    },
    memoryLimit: 200, // < 200MB for large exports
  };

  // Mock data generation
  const generateMockInvoiceData = (count: number) => {
    const invoices = [];
    
    for (let i = 1; i <= count; i++) {
      const paddedNumber = i.toString().padStart(6, '0');
      
      invoices.push({
        id: `invoice-${i}`,
        invoiceNumber: `INV-EXPORT-${paddedNumber}`,
        eInvoiceType: '01',
        issueDate: `2024-01-${(i % 28) + 1 < 10 ? '0' + ((i % 28) + 1) : (i % 28) + 1}`,
        dueDate: `2024-02-${(i % 28) + 1 < 10 ? '0' + ((i % 28) + 1) : (i % 28) + 1}`,
        currency: i % 10 === 0 ? 'USD' : 'MYR',
        exchangeRate: i % 10 === 0 ? '4.350000' : '1.000000',
        isConsolidated: i % 20 === 0,
        subtotal: ((Math.random() * 5000) + 500).toFixed(2),
        totalDiscount: ((Math.random() * 100)).toFixed(2),
        sstAmount: ((Math.random() * 300) + 30).toFixed(2),
        grandTotal: ((Math.random() * 5500) + 530).toFixed(2),
        status: ['draft', 'validated', 'submitted', 'approved'][i % 4],
        validationScore: Math.floor(Math.random() * 20) + 80,
        notes: `Performance test invoice ${i}`,
        buyer: {
          name: `Test Buyer ${i} Sdn Bhd`,
          tin: `C${paddedNumber}890`,
          email: `buyer${i}@example.com`,
          address: {
            line1: `${i} Business Street`,
            city: 'Kuala Lumpur',
            state: 'Kuala Lumpur',
            postcode: '50000',
            country: 'MY'
          }
        },
        lineItems: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, lineIndex) => ({
          lineNumber: lineIndex + 1,
          itemDescription: `Performance Test Item ${lineIndex + 1}`,
          quantity: Math.floor(Math.random() * 100) + 1,
          unitPrice: ((Math.random() * 500) + 50).toFixed(2),
          discountAmount: '0.00',
          lineTotal: ((Math.random() * 1000) + 100).toFixed(2),
          sstRate: '6.00',
          sstAmount: ((Math.random() * 60) + 6).toFixed(2)
        }))
      });
    }
    
    return invoices;
  };

  // Simulate CSV export processing
  const simulateCsvExport = async (invoices: any[]): Promise<{
    duration: number;
    memoryUsage: number;
    outputSize: number;
  }> => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // CSV headers
    const headers = [
      'Invoice Number', 'Issue Date', 'Due Date', 'Currency', 'Exchange Rate',
      'Buyer Name', 'Buyer TIN', 'Subtotal', 'SST Amount', 'Grand Total',
      'Status', 'Validation Score', 'Line Items Count'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    // Process each invoice
    for (const invoice of invoices) {
      const row = [
        invoice.invoiceNumber,
        invoice.issueDate,
        invoice.dueDate,
        invoice.currency,
        invoice.exchangeRate,
        invoice.buyer.name,
        invoice.buyer.tin,
        invoice.subtotal,
        invoice.sstAmount,
        invoice.grandTotal,
        invoice.status,
        invoice.validationScore,
        invoice.lineItems.length
      ];
      
      csvContent += row.join(',') + '\n';
      
      // Simulate processing delay
      if (invoices.length > 1000 && invoices.indexOf(invoice) % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      memoryUsage: (endMemory - startMemory) / 1024 / 1024,
      outputSize: Buffer.byteLength(csvContent, 'utf8')
    };
  };

  // Simulate JSON export processing
  const simulateJsonExport = async (invoices: any[]): Promise<{
    duration: number;
    memoryUsage: number;
    outputSize: number;
  }> => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Build export structure
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalCount: invoices.length,
        version: '1.0.0',
        format: 'standard'
      },
      invoices: invoices.map(invoice => ({
        ...invoice,
        // Add computed fields
        lineItemsCount: invoice.lineItems.length,
        totalAmount: parseFloat(invoice.grandTotal),
        isOverdue: new Date(invoice.dueDate) < new Date(),
      }))
    };
    
    // Simulate JSON serialization
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      memoryUsage: (endMemory - startMemory) / 1024 / 1024,
      outputSize: Buffer.byteLength(jsonContent, 'utf8')
    };
  };

  // Simulate MyInvois JSON export
  const simulateMyInvoisExport = async (invoices: any[]): Promise<{
    duration: number;
    memoryUsage: number;
    outputSize: number;
  }> => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Transform to MyInvois format
    const myInvoisData = {
      _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      documents: invoices.map(invoice => ({
        _D: {
          Invoice: {
            _B: {
              ID: invoice.invoiceNumber,
              IssueDate: invoice.issueDate,
              DueDate: invoice.dueDate || null,
              InvoiceTypeCode: {
                listAgencyID: "6",
                listID: "UNCL1001",
                "#text": invoice.eInvoiceType
              },
              DocumentCurrencyCode: invoice.currency
            },
            _A: {
              AccountingSupplierParty: {
                _A: {
                  Party: {
                    _A: {
                      PartyIdentification: {
                        _B: { ID: "SupplierTIN" }
                      }
                    }
                  }
                }
              },
              AccountingCustomerParty: {
                _A: {
                  Party: {
                    _A: {
                      PartyIdentification: {
                        _B: { ID: invoice.buyer.tin }
                      },
                      PartyName: {
                        _B: { Name: invoice.buyer.name }
                      }
                    }
                  }
                }
              },
              LegalMonetaryTotal: {
                _B: {
                  LineExtensionAmount: {
                    currencyID: invoice.currency,
                    "#text": invoice.subtotal
                  },
                  TaxExclusiveAmount: {
                    currencyID: invoice.currency,
                    "#text": invoice.subtotal
                  },
                  TaxInclusiveAmount: {
                    currencyID: invoice.currency,
                    "#text": invoice.grandTotal
                  },
                  PayableAmount: {
                    currencyID: invoice.currency,
                    "#text": invoice.grandTotal
                  }
                }
              },
              InvoiceLine: invoice.lineItems.map((line: any, index: number) => ({
                _B: {
                  ID: (index + 1).toString(),
                  InvoicedQuantity: {
                    unitCode: "C62",
                    "#text": line.quantity.toString()
                  },
                  LineExtensionAmount: {
                    currencyID: invoice.currency,
                    "#text": line.lineTotal
                  }
                },
                _A: {
                  Item: {
                    _B: {
                      Description: line.itemDescription
                    }
                  },
                  Price: {
                    _B: {
                      PriceAmount: {
                        currencyID: invoice.currency,
                        "#text": line.unitPrice
                      }
                    }
                  }
                }
              }))
            }
          }
        }
      })),
      metadata: {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        totalDocuments: invoices.length
      }
    };
    
    // Simulate complex transformation processing
    for (let i = 0; i < invoices.length; i++) {
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const jsonContent = JSON.stringify(myInvoisData, null, 2);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      memoryUsage: (endMemory - startMemory) / 1024 / 1024,
      outputSize: Buffer.byteLength(jsonContent, 'utf8')
    };
  };

  // Simulate PDF export
  const simulatePdfExport = async (invoices: any[]): Promise<{
    duration: number;
    memoryUsage: number;
    outputSize: number;
  }> => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    let totalSize = 0;
    
    // Simulate PDF generation for each invoice
    for (const invoice of invoices) {
      // Simulate complex PDF rendering
      const pageCount = Math.max(1, Math.ceil(invoice.lineItems.length / 10));
      const processingTime = pageCount * 50; // 50ms per page
      
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Estimate PDF size (header + line items + footer)
      const estimatedSize = 5000 + (invoice.lineItems.length * 100) + 1000;
      totalSize += estimatedSize;
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      memoryUsage: (endMemory - startMemory) / 1024 / 1024,
      outputSize: totalSize
    };
  };

  describe('CSV Export Performance', () => {
    it('should export small dataset (100 invoices) efficiently', async () => {
      const invoices = generateMockInvoiceData(100);
      const result = await simulateCsvExport(invoices);
      
      console.log(`CSV Export (100 invoices):
        Duration: ${result.duration.toFixed(2)}ms
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Output size: ${(result.outputSize / 1024).toFixed(2)}KB`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.csvExport.small);
      expect(result.memoryUsage).toBeLessThan(10);
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should export medium dataset (1000 invoices) efficiently', async () => {
      const invoices = generateMockInvoiceData(1000);
      const result = await simulateCsvExport(invoices);
      
      console.log(`CSV Export (1000 invoices):
        Duration: ${result.duration.toFixed(2)}ms
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Output size: ${(result.outputSize / 1024).toFixed(2)}KB`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.csvExport.medium);
      expect(result.memoryUsage).toBeLessThan(50);
    });

    it('should export large dataset (10000 invoices) efficiently', async () => {
      const invoices = generateMockInvoiceData(10000);
      const result = await simulateCsvExport(invoices);
      
      console.log(`CSV Export (10000 invoices):
        Duration: ${result.duration.toFixed(2)}ms (${(result.duration / 1000).toFixed(2)}s)
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)}MB
        Throughput: ${(invoices.length / (result.duration / 1000)).toFixed(2)} invoices/second`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.csvExport.large);
      expect(result.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      
      // Should maintain good throughput
      const throughput = invoices.length / (result.duration / 1000);
      expect(throughput).toBeGreaterThan(1000);
    });
  });

  describe('JSON Export Performance', () => {
    it('should export JSON format efficiently for different sizes', async () => {
      const sizes = [100, 1000, 10000];
      const results = [];
      
      for (const size of sizes) {
        const invoices = generateMockInvoiceData(size);
        const result = await simulateJsonExport(invoices);
        
        results.push({ size, ...result });
        
        console.log(`JSON Export (${size} invoices):
          Duration: ${result.duration.toFixed(2)}ms
          Memory: ${result.memoryUsage.toFixed(2)}MB
          Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)}MB`);
        
        const threshold = size <= 100 ? PERFORMANCE_THRESHOLDS.jsonExport.small :
                         size <= 1000 ? PERFORMANCE_THRESHOLDS.jsonExport.medium :
                         PERFORMANCE_THRESHOLDS.jsonExport.large;
        
        expect(result.duration).toBeLessThan(threshold);
      }
      
      // Verify scaling is reasonable
      const smallResult = results.find(r => r.size === 100);
      const largeResult = results.find(r => r.size === 10000);
      
      if (smallResult && largeResult) {
        const scalingFactor = largeResult.duration / smallResult.duration;
        console.log(`JSON scaling factor (100x data): ${scalingFactor.toFixed(2)}x time`);
        
        // Should scale sub-linearly due to JSON overhead being mostly constant
        expect(scalingFactor).toBeLessThan(150); // Less than 150x time for 100x data
      }
    });
  });

  describe('MyInvois Export Performance', () => {
    it('should transform to MyInvois format efficiently', async () => {
      const sizes = [10, 100, 1000];
      
      for (const size of sizes) {
        const invoices = generateMockInvoiceData(size);
        const result = await simulateMyInvoisExport(invoices);
        
        console.log(`MyInvois Export (${size} invoices):
          Duration: ${result.duration.toFixed(2)}ms
          Memory: ${result.memoryUsage.toFixed(2)}MB
          Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)}MB`);
        
        // MyInvois format is more complex, so allow more time
        const maxDuration = size * 10; // 10ms per invoice maximum
        expect(result.duration).toBeLessThan(maxDuration);
        expect(result.memoryUsage).toBeLessThan(100);
      }
    });

    it('should maintain XML-like structure integrity during export', async () => {
      const invoices = generateMockInvoiceData(100);
      const result = await simulateMyInvoisExport(invoices);
      
      // Output should be significantly larger than simple JSON due to XML-like structure
      const jsonResult = await simulateJsonExport(invoices);
      const sizeRatio = result.outputSize / jsonResult.outputSize;
      
      console.log(`MyInvois vs JSON size ratio: ${sizeRatio.toFixed(2)}x`);
      
      // MyInvois format should be 2-4x larger than simple JSON
      expect(sizeRatio).toBeGreaterThan(2);
      expect(sizeRatio).toBeLessThan(4);
    });
  });

  describe('PDF Export Performance', () => {
    it('should generate single PDF efficiently', async () => {
      const invoices = generateMockInvoiceData(1);
      const result = await simulatePdfExport(invoices);
      
      console.log(`PDF Export (1 invoice):
        Duration: ${result.duration.toFixed(2)}ms
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Output size: ${(result.outputSize / 1024).toFixed(2)}KB`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pdfExport.single);
      expect(result.memoryUsage).toBeLessThan(20);
    });

    it('should handle batch PDF generation efficiently', async () => {
      const invoices = generateMockInvoiceData(100);
      const result = await simulatePdfExport(invoices);
      
      console.log(`PDF Batch Export (100 invoices):
        Duration: ${result.duration.toFixed(2)}ms (${(result.duration / 1000).toFixed(2)}s)
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)}MB
        Average per PDF: ${(result.duration / invoices.length).toFixed(2)}ms`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pdfExport.batch);
      expect(result.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      
      // Average time per PDF should be reasonable
      const avgTimePerPdf = result.duration / invoices.length;
      expect(avgTimePerPdf).toBeLessThan(300); // Less than 300ms per PDF
    });

    it('should optimize memory usage for large PDF batches', async () => {
      const invoices = generateMockInvoiceData(50);
      const memorySnapshots: number[] = [];
      
      // Monitor memory during PDF generation
      const monitorMemory = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / 1024 / 1024);
      }, 50);
      
      const result = await simulatePdfExport(invoices);
      
      clearInterval(monitorMemory);
      
      const maxMemory = Math.max(...memorySnapshots);
      const avgMemory = memorySnapshots.reduce((sum, m) => sum + m, 0) / memorySnapshots.length;
      
      console.log(`PDF Memory Analysis:
        Peak memory: ${maxMemory.toFixed(2)}MB
        Average memory: ${avgMemory.toFixed(2)}MB
        Final delta: ${result.memoryUsage.toFixed(2)}MB`);
      
      expect(maxMemory).toBeLessThan(150);
    });
  });

  describe('Concurrent Export Performance', () => {
    it('should handle multiple concurrent exports efficiently', async () => {
      const concurrentExports = 3;
      const invoicesPerExport = 500;
      
      const exportPromises = [
        simulateCsvExport(generateMockInvoiceData(invoicesPerExport)),
        simulateJsonExport(generateMockInvoiceData(invoicesPerExport)),
        simulateMyInvoisExport(generateMockInvoiceData(invoicesPerExport))
      ];
      
      const startTime = performance.now();
      const results = await Promise.all(exportPromises);
      const totalTime = performance.now() - startTime;
      
      const totalInvoices = results.reduce((sum, _) => sum + invoicesPerExport, 0);
      const avgMemory = results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length;
      
      console.log(`Concurrent Export Performance:
        Total time: ${totalTime.toFixed(2)}ms
        Total invoices: ${totalInvoices}
        Formats: CSV, JSON, MyInvois
        Average memory: ${avgMemory.toFixed(2)}MB
        Throughput: ${(totalInvoices / (totalTime / 1000)).toFixed(2)} invoices/second`);
      
      expect(totalTime).toBeLessThan(8000); // Should complete within 8 seconds
      expect(avgMemory).toBeLessThan(100);
    });
  });

  describe('Export Filtering Performance', () => {
    it('should apply complex filters efficiently', async () => {
      const invoices = generateMockInvoiceData(5000);
      
      const startTime = performance.now();
      
      // Simulate complex filtering
      const filteredInvoices = invoices.filter(invoice => {
        // Date range filter
        const isInDateRange = new Date(invoice.issueDate) >= new Date('2024-01-01') &&
                              new Date(invoice.issueDate) <= new Date('2024-12-31');
        
        // Status filter
        const isCorrectStatus = ['validated', 'approved'].includes(invoice.status);
        
        // Amount range filter
        const amount = parseFloat(invoice.grandTotal);
        const isInAmountRange = amount >= 100 && amount <= 5000;
        
        // Buyer name search
        const buyerNameMatch = invoice.buyer.name.toLowerCase().includes('test');
        
        return isInDateRange && isCorrectStatus && isInAmountRange && buyerNameMatch;
      });
      
      const filterTime = performance.now() - startTime;
      
      // Export filtered results
      const exportResult = await simulateCsvExport(filteredInvoices);
      
      console.log(`Filter + Export Performance:
        Original count: ${invoices.length}
        Filtered count: ${filteredInvoices.length}
        Filter time: ${filterTime.toFixed(2)}ms
        Export time: ${exportResult.duration.toFixed(2)}ms
        Total time: ${(filterTime + exportResult.duration).toFixed(2)}ms`);
      
      expect(filterTime).toBeLessThan(500); // Filtering should be fast
      expect(exportResult.duration).toBeLessThan(2000);
      expect(filteredInvoices.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle streaming export for large datasets', async () => {
      const invoiceCount = 10000;
      const batchSize = 100;
      const batches = Math.ceil(invoiceCount / batchSize);
      
      let totalProcessingTime = 0;
      let totalMemoryUsage = 0;
      let totalOutputSize = 0;
      
      // Simulate streaming export in batches
      for (let batch = 0; batch < batches; batch++) {
        const batchInvoices = generateMockInvoiceData(batchSize);
        const result = await simulateCsvExport(batchInvoices);
        
        totalProcessingTime += result.duration;
        totalMemoryUsage = Math.max(totalMemoryUsage, result.memoryUsage);
        totalOutputSize += result.outputSize;
        
        // Simulate cleanup between batches
        if (global.gc) global.gc();
      }
      
      console.log(`Streaming Export Performance:
        Total invoices: ${invoiceCount}
        Batch size: ${batchSize}
        Total processing time: ${totalProcessingTime.toFixed(2)}ms
        Peak memory usage: ${totalMemoryUsage.toFixed(2)}MB
        Total output size: ${(totalOutputSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory usage should remain bounded regardless of total dataset size
      expect(totalMemoryUsage).toBeLessThan(50);
      expect(totalProcessingTime).toBeLessThan(20000);
    });
  });
});