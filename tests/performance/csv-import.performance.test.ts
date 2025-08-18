import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';

describe('CSV Import Performance Tests', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    smallFile: 1000,    // < 1s for 100 rows
    mediumFile: 5000,   // < 5s for 1000 rows
    largeFile: 15000,   // < 15s for 10000 rows
    memoryLimit: 100,   // < 100MB memory usage
  };

  const generateCsvData = (rowCount: number): string => {
    let csv = 'Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes\n';
    
    for (let i = 1; i <= rowCount; i++) {
      const paddedNumber = i.toString().padStart(6, '0');
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      
      csv += `INV-PERF-${paddedNumber},2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')},2024-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')},MYR,1.000000,Performance Test Buyer ${i} Sdn Bhd,C${paddedNumber}890,Performance Test Service ${i},${Math.floor(Math.random() * 10) + 1},${((Math.random() * 1000) + 100).toFixed(2)},6.00,Performance test row ${i}\n`;
    }
    
    return csv;
  };

  const simulateApiImport = async (csvData: string): Promise<{
    duration: number;
    memoryUsage: number;
    successCount: number;
    errorCount: number;
  }> => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Simulate CSV parsing
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    const dataRows = lines.slice(1);
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Simulate processing each row
    for (const row of dataRows) {
      const cells = row.split(',');
      
      try {
        // Simulate validation
        const invoice = {
          invoiceNumber: cells[0],
          issueDate: cells[1],
          dueDate: cells[2],
          currency: cells[3],
          exchangeRate: parseFloat(cells[4]),
          buyerName: cells[5],
          buyerTin: cells[6],
          itemDescription: cells[7],
          quantity: parseInt(cells[8]),
          unitPrice: parseFloat(cells[9]),
          sstRate: parseFloat(cells[10]),
          notes: cells[11]
        };
        
        // Basic validation
        if (!invoice.invoiceNumber || !invoice.issueDate || !invoice.buyerName) {
          throw new Error('Missing required fields');
        }
        
        if (isNaN(invoice.quantity) || isNaN(invoice.unitPrice)) {
          throw new Error('Invalid numeric values');
        }
        
        // Simulate Malaysian validation rules
        const tinPattern = /^[CG]\d{10}$|^\d{12}$/;
        if (invoice.buyerTin && !tinPattern.test(invoice.buyerTin)) {
          throw new Error('Invalid TIN format');
        }
        
        // Simulate database insertion delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
        
        results.push(invoice);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      memoryUsage: (endMemory - startMemory) / 1024 / 1024, // MB
      successCount,
      errorCount
    };
  };

  describe('Small File Performance (100 rows)', () => {
    it('should process 100 invoices within performance threshold', async () => {
      const csvData = generateCsvData(100);
      const result = await simulateApiImport(csvData);
      
      console.log(`Small file performance:
        Duration: ${result.duration.toFixed(2)}ms
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Success: ${result.successCount}
        Errors: ${result.errorCount}`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.smallFile);
      expect(result.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      expect(result.successCount).toBe(100);
      expect(result.errorCount).toBe(0);
    });

    it('should maintain consistent performance across multiple small imports', async () => {
      const runs = 5;
      const durations: number[] = [];
      
      for (let i = 0; i < runs; i++) {
        const csvData = generateCsvData(100);
        const result = await simulateApiImport(csvData);
        durations.push(result.duration);
      }
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runs;
      const maxDeviation = Math.max(...durations.map(d => Math.abs(d - avgDuration)));
      
      console.log(`Consistency test:
        Average: ${avgDuration.toFixed(2)}ms
        Max deviation: ${maxDeviation.toFixed(2)}ms
        All durations: ${durations.map(d => d.toFixed(2)).join(', ')}ms`);
      
      // Performance should be consistent (max 50% deviation from average)
      expect(maxDeviation).toBeLessThan(avgDuration * 0.5);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.smallFile);
    });
  });

  describe('Medium File Performance (1000 rows)', () => {
    it('should process 1000 invoices within performance threshold', async () => {
      const csvData = generateCsvData(1000);
      const result = await simulateApiImport(csvData);
      
      console.log(`Medium file performance:
        Duration: ${result.duration.toFixed(2)}ms
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Success: ${result.successCount}
        Errors: ${result.errorCount}`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumFile);
      expect(result.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      expect(result.successCount).toBe(1000);
    });

    it('should demonstrate linear scaling from small to medium files', async () => {
      const smallResult = await simulateApiImport(generateCsvData(100));
      const mediumResult = await simulateApiImport(generateCsvData(1000));
      
      const scalingFactor = mediumResult.duration / smallResult.duration;
      
      console.log(`Scaling analysis:
        Small (100): ${smallResult.duration.toFixed(2)}ms
        Medium (1000): ${mediumResult.duration.toFixed(2)}ms
        Scaling factor: ${scalingFactor.toFixed(2)}x`);
      
      // Should scale roughly linearly (between 8x and 12x for 10x data)
      expect(scalingFactor).toBeGreaterThan(8);
      expect(scalingFactor).toBeLessThan(12);
    });
  });

  describe('Large File Performance (10000 rows)', () => {
    it('should process 10000 invoices within performance threshold', async () => {
      const csvData = generateCsvData(10000);
      const result = await simulateApiImport(csvData);
      
      console.log(`Large file performance:
        Duration: ${result.duration.toFixed(2)}ms (${(result.duration / 1000).toFixed(2)}s)
        Memory: ${result.memoryUsage.toFixed(2)}MB
        Success: ${result.successCount}
        Errors: ${result.errorCount}
        Throughput: ${(result.successCount / (result.duration / 1000)).toFixed(2)} invoices/second`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.largeFile);
      expect(result.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      expect(result.successCount).toBe(10000);
      
      // Should maintain reasonable throughput (>500 invoices/second)
      const throughput = result.successCount / (result.duration / 1000);
      expect(throughput).toBeGreaterThan(500);
    });

    it('should handle memory efficiently for large files', async () => {
      const csvData = generateCsvData(10000);
      
      // Monitor memory usage throughout processing
      const memorySnapshots: number[] = [];
      
      const monitorMemory = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / 1024 / 1024);
      }, 100);
      
      try {
        const result = await simulateApiImport(csvData);
        
        clearInterval(monitorMemory);
        
        const maxMemory = Math.max(...memorySnapshots);
        const avgMemory = memorySnapshots.reduce((sum, m) => sum + m, 0) / memorySnapshots.length;
        
        console.log(`Memory analysis:
          Peak memory: ${maxMemory.toFixed(2)}MB
          Average memory: ${avgMemory.toFixed(2)}MB
          Final memory delta: ${result.memoryUsage.toFixed(2)}MB`);
        
        expect(maxMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
      } catch (error) {
        clearInterval(monitorMemory);
        throw error;
      }
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle validation errors efficiently', async () => {
      // Generate CSV with 50% invalid data
      let csvData = 'Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes\n';
      
      for (let i = 1; i <= 1000; i++) {
        const paddedNumber = i.toString().padStart(6, '0');
        
        if (i % 2 === 0) {
          // Valid row
          csvData += `INV-VALID-${paddedNumber},2024-01-15,2024-02-15,MYR,1.000000,Valid Buyer ${i},C${paddedNumber}890,Service,1,100.00,6.00,Valid\n`;
        } else {
          // Invalid row (bad TIN, invalid date, invalid numbers)
          csvData += `INV-INVALID-${paddedNumber},invalid-date,2024-02-15,MYR,1.000000,Invalid Buyer ${i},BADTIN${i},Service,abc,invalid,6.00,Invalid\n`;
        }
      }
      
      const result = await simulateApiImport(csvData);
      
      console.log(`Error handling performance:
        Duration: ${result.duration.toFixed(2)}ms
        Success: ${result.successCount}
        Errors: ${result.errorCount}
        Error rate: ${(result.errorCount / (result.successCount + result.errorCount) * 100).toFixed(1)}%`);
      
      expect(result.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumFile);
      expect(result.successCount).toBe(500);
      expect(result.errorCount).toBe(500);
    });
  });

  describe('Concurrent Import Performance', () => {
    it('should handle multiple concurrent imports efficiently', async () => {
      const concurrentImports = 3;
      const rowsPerImport = 500;
      
      const importPromises = Array(concurrentImports).fill(null).map(async (_, index) => {
        const csvData = generateCsvData(rowsPerImport);
        return simulateApiImport(csvData);
      });
      
      const startTime = performance.now();
      const results = await Promise.all(importPromises);
      const totalTime = performance.now() - startTime;
      
      const totalRows = results.reduce((sum, r) => sum + r.successCount, 0);
      const avgMemory = results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length;
      
      console.log(`Concurrent import performance:
        Total time: ${totalTime.toFixed(2)}ms
        Total rows processed: ${totalRows}
        Average memory per import: ${avgMemory.toFixed(2)}MB
        Throughput: ${(totalRows / (totalTime / 1000)).toFixed(2)} invoices/second`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumFile * 1.5); // Allow 50% overhead for concurrency
      expect(totalRows).toBe(concurrentImports * rowsPerImport);
      expect(avgMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
    });
  });

  describe('Malaysian Validation Performance', () => {
    it('should validate Malaysian rules efficiently at scale', async () => {
      const testCases = [
        { tin: 'C1234567890', valid: true },
        { tin: '123456789012', valid: true },
        { tin: 'G1234567890', valid: true },
        { tin: 'INVALID123', valid: false },
        { tin: '12345', valid: false }
      ];
      
      const iterations = 10000;
      const startTime = performance.now();
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        const testCase = testCases[i % testCases.length];
        const tinPattern = /^[CG]\d{10}$|^\d{12}$/;
        const isValid = tinPattern.test(testCase.tin);
        
        if (isValid) validCount++;
        else invalidCount++;
      }
      
      const duration = performance.now() - startTime;
      const validationsPerSecond = iterations / (duration / 1000);
      
      console.log(`TIN validation performance:
        Duration: ${duration.toFixed(2)}ms
        Iterations: ${iterations}
        Validations/second: ${validationsPerSecond.toFixed(0)}
        Valid: ${validCount}, Invalid: ${invalidCount}`);
      
      // Should be able to validate at least 100,000 TINs per second
      expect(validationsPerSecond).toBeGreaterThan(100000);
    });

    it('should calculate SST efficiently at scale', async () => {
      const iterations = 100000;
      const startTime = performance.now();
      
      let totalSst = 0;
      
      for (let i = 0; i < iterations; i++) {
        const lineTotal = Math.random() * 10000 + 100;
        const sstRate = 6.0;
        const sstAmount = Math.round((lineTotal * sstRate / 100) * 100) / 100;
        totalSst += sstAmount;
      }
      
      const duration = performance.now() - startTime;
      const calculationsPerSecond = iterations / (duration / 1000);
      
      console.log(`SST calculation performance:
        Duration: ${duration.toFixed(2)}ms
        Iterations: ${iterations}
        Calculations/second: ${calculationsPerSecond.toFixed(0)}
        Total SST: ${totalSst.toFixed(2)}`);
      
      // Should be able to calculate at least 1 million SST amounts per second
      expect(calculationsPerSecond).toBeGreaterThan(1000000);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated imports', async () => {
      const iterations = 10;
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const csvData = generateCsvData(100);
        await simulateApiImport(csvData);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        memorySnapshots.push(memoryUsage);
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Memory snapshots: ${memorySnapshots.map(m => m.toFixed(2)).join(', ')}MB`);
      
      // Memory should not consistently increase (allowing for some variance)
      const firstHalf = memorySnapshots.slice(0, Math.floor(iterations / 2));
      const secondHalf = memorySnapshots.slice(Math.floor(iterations / 2));
      
      const firstAvg = firstHalf.reduce((sum, m) => sum + m, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m, 0) / secondHalf.length;
      
      const memoryIncrease = secondAvg - firstAvg;
      
      console.log(`Memory analysis:
        First half average: ${firstAvg.toFixed(2)}MB
        Second half average: ${secondAvg.toFixed(2)}MB
        Increase: ${memoryIncrease.toFixed(2)}MB`);
      
      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10);
    });
  });
});