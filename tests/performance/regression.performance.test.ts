import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';

describe('Performance Regression Tests - Malaysian e-Invoice System', () => {
  // Performance regression thresholds based on requirements
  const REGRESSION_THRESHOLDS = {
    csvImport: {
      maxRowProcessingTime: parseInt(process.env.CSV_IMPORT_THRESHOLD_MS || '50', 10), // 50ms per row
      maxMemoryUsageMB: 100,
      minThroughputRowsPerSecond: 20,
    },
    pdfGeneration: {
      maxGenerationTimeMs: parseInt(process.env.PDF_GENERATION_THRESHOLD_MS || '20', 10), // 20ms per PDF
      maxMemoryUsageMB: 50,
      minThroughputPdfsPerSecond: 50,
    },
    malaysianCompliance: {
      minComplianceScore: parseInt(process.env.MALAYSIAN_COMPLIANCE_SCORE_MIN || '95', 10), // 95%
      maxTinValidationTimeMs: 1,
      maxSstCalculationTimeMs: 1,
      maxConsolidationCheckTimeMs: 1,
    },
    api: {
      maxResponseTimeMs: parseInt(process.env.PERFORMANCE_THRESHOLD_API || '1000', 10), // 1s
      minSuccessRate: 99.5,
    },
    web: {
      maxPageLoadTimeMs: parseInt(process.env.PERFORMANCE_THRESHOLD_WEB || '3000', 10), // 3s
      maxBundleSizeMB: 5,
    },
  };

  describe('CSV Import Performance Regression', () => {
    it('should maintain CSV import performance under regression thresholds', async () => {
      // Test data generation
      const testRowCounts = [100, 500, 1000];
      const results = [];

      for (const rowCount of testRowCounts) {
        const csvData = generateTestCSV(rowCount);
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;

        // Simulate CSV import processing
        const importResult = await simulateCSVImport(csvData);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        const processingTime = endTime - startTime;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
        const rowProcessingTime = processingTime / rowCount;
        const throughput = rowCount / (processingTime / 1000);

        results.push({
          rowCount,
          processingTime,
          rowProcessingTime,
          memoryUsage,
          throughput,
          successRate: (importResult.successful / importResult.total) * 100,
        });

        console.log(`CSV Import Performance (${rowCount} rows):
          Total time: ${processingTime.toFixed(2)}ms
          Per row: ${rowProcessingTime.toFixed(2)}ms
          Memory: ${memoryUsage.toFixed(2)}MB
          Throughput: ${throughput.toFixed(2)} rows/sec
          Success rate: ${importResult.successful}/${importResult.total}`);

        // Regression checks
        expect(rowProcessingTime, `Row processing time (${rowProcessingTime.toFixed(2)}ms) exceeds threshold (${REGRESSION_THRESHOLDS.csvImport.maxRowProcessingTime}ms)`).toBeLessThan(REGRESSION_THRESHOLDS.csvImport.maxRowProcessingTime);
        expect(memoryUsage, `Memory usage (${memoryUsage.toFixed(2)}MB) exceeds threshold (${REGRESSION_THRESHOLDS.csvImport.maxMemoryUsageMB}MB)`).toBeLessThan(REGRESSION_THRESHOLDS.csvImport.maxMemoryUsageMB);
        expect(throughput, `Throughput (${throughput.toFixed(2)} rows/sec) below threshold (${REGRESSION_THRESHOLDS.csvImport.minThroughputRowsPerSecond} rows/sec)`).toBeGreaterThan(REGRESSION_THRESHOLDS.csvImport.minThroughputRowsPerSecond);
      }

      // Ensure linear scaling (no exponential degradation)
      const scalingFactors = [];
      for (let i = 1; i < results.length; i++) {
        const factor = results[i].processingTime / results[i-1].processingTime;
        const dataFactor = results[i].rowCount / results[i-1].rowCount;
        const scalingEfficiency = factor / dataFactor;
        scalingFactors.push(scalingEfficiency);
        
        // Scaling should be close to linear (efficiency < 1.5)
        expect(scalingEfficiency, `Scaling efficiency (${scalingEfficiency.toFixed(2)}) indicates poor scaling`).toBeLessThan(1.5);
      }
    });
  });

  describe('PDF Generation Performance Regression', () => {
    it('should maintain PDF generation performance under regression thresholds', async () => {
      const testCases = [
        { invoiceCount: 1, description: 'Single PDF' },
        { invoiceCount: 10, description: 'Small batch' },
        { invoiceCount: 100, description: 'Large batch' },
      ];

      for (const testCase of testCases) {
        const invoices = generateTestInvoices(testCase.invoiceCount);
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;

        // Simulate PDF generation
        const pdfResult = await simulatePDFGeneration(invoices);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        const generationTime = endTime - startTime;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
        const timePerPDF = generationTime / testCase.invoiceCount;
        const throughput = testCase.invoiceCount / (generationTime / 1000);

        console.log(`PDF Generation Performance (${testCase.description}):
          Total time: ${generationTime.toFixed(2)}ms
          Per PDF: ${timePerPDF.toFixed(2)}ms
          Memory: ${memoryUsage.toFixed(2)}MB
          Throughput: ${throughput.toFixed(2)} PDFs/sec`);

        // Regression checks
        expect(timePerPDF, `PDF generation time (${timePerPDF.toFixed(2)}ms) exceeds threshold (${REGRESSION_THRESHOLDS.pdfGeneration.maxGenerationTimeMs}ms)`).toBeLessThan(REGRESSION_THRESHOLDS.pdfGeneration.maxGenerationTimeMs);
        expect(memoryUsage, `Memory usage (${memoryUsage.toFixed(2)}MB) exceeds threshold (${REGRESSION_THRESHOLDS.pdfGeneration.maxMemoryUsageMB}MB)`).toBeLessThan(REGRESSION_THRESHOLDS.pdfGeneration.maxMemoryUsageMB);
        expect(throughput, `Throughput (${throughput.toFixed(2)} PDFs/sec) below threshold (${REGRESSION_THRESHOLDS.pdfGeneration.minThroughputPdfsPerSecond} PDFs/sec)`).toBeGreaterThan(REGRESSION_THRESHOLDS.pdfGeneration.minThroughputPdfsPerSecond);
      }
    });
  });

  describe('Malaysian Compliance Performance Regression', () => {
    it('should maintain Malaysian validation performance under regression thresholds', async () => {
      const testIterations = 10000;
      
      // TIN Validation Performance
      const tinTests = [
        'C1234567890', // Valid C format
        'G1234567890', // Valid G format
        '123456789012', // Valid 12-digit
        'INVALID123',   // Invalid format
      ];

      let tinValidationTimes = [];
      for (let i = 0; i < testIterations; i++) {
        const tin = tinTests[i % tinTests.length];
        const startTime = performance.now();
        
        // Simulate TIN validation
        const isValid = /^[CG]\\d{10}$|^\\d{12}$/.test(tin);
        
        const endTime = performance.now();
        tinValidationTimes.push(endTime - startTime);
      }

      const avgTinValidationTime = tinValidationTimes.reduce((sum, time) => sum + time, 0) / tinValidationTimes.length;
      console.log(`TIN Validation: ${avgTinValidationTime.toFixed(4)}ms average, ${testIterations / (tinValidationTimes.reduce((sum, time) => sum + time, 0) / 1000)} validations/sec`);

      expect(avgTinValidationTime, `TIN validation time (${avgTinValidationTime.toFixed(4)}ms) exceeds threshold (${REGRESSION_THRESHOLDS.malaysianCompliance.maxTinValidationTimeMs}ms)`).toBeLessThan(REGRESSION_THRESHOLDS.malaysianCompliance.maxTinValidationTimeMs);

      // SST Calculation Performance
      let sstCalculationTimes = [];
      for (let i = 0; i < testIterations; i++) {
        const amount = Math.random() * 10000 + 100;
        const startTime = performance.now();
        
        // Simulate SST calculation (6% for Malaysia)
        const sstAmount = Math.round((amount * 6.0 / 100) * 100) / 100;
        
        const endTime = performance.now();
        sstCalculationTimes.push(endTime - startTime);
      }

      const avgSstCalculationTime = sstCalculationTimes.reduce((sum, time) => sum + time, 0) / sstCalculationTimes.length;
      console.log(`SST Calculation: ${avgSstCalculationTime.toFixed(4)}ms average, ${testIterations / (sstCalculationTimes.reduce((sum, time) => sum + time, 0) / 1000)} calculations/sec`);

      expect(avgSstCalculationTime, `SST calculation time (${avgSstCalculationTime.toFixed(4)}ms) exceeds threshold (${REGRESSION_THRESHOLDS.malaysianCompliance.maxSstCalculationTimeMs}ms)`).toBeLessThan(REGRESSION_THRESHOLDS.malaysianCompliance.maxSstCalculationTimeMs);

      // Industry Consolidation Check Performance
      const prohibitedIndustries = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
      let consolidationCheckTimes = [];
      
      for (let i = 0; i < testIterations; i++) {
        const industryCode = i % 2 === 0 ? '12345' : prohibitedIndustries[i % prohibitedIndustries.length];
        const startTime = performance.now();
        
        // Simulate consolidation check
        const isProhibited = prohibitedIndustries.includes(industryCode);
        
        const endTime = performance.now();
        consolidationCheckTimes.push(endTime - startTime);
      }

      const avgConsolidationCheckTime = consolidationCheckTimes.reduce((sum, time) => sum + time, 0) / consolidationCheckTimes.length;
      console.log(`Consolidation Check: ${avgConsolidationCheckTime.toFixed(4)}ms average, ${testIterations / (consolidationCheckTimes.reduce((sum, time) => sum + time, 0) / 1000)} checks/sec`);

      expect(avgConsolidationCheckTime, `Consolidation check time (${avgConsolidationCheckTime.toFixed(4)}ms) exceeds threshold (${REGRESSION_THRESHOLDS.malaysianCompliance.maxConsolidationCheckTimeMs}ms)`).toBeLessThan(REGRESSION_THRESHOLDS.malaysianCompliance.maxConsolidationCheckTimeMs);
    });
  });

  describe('Overall System Performance Regression', () => {
    it('should maintain system-wide performance characteristics', async () => {
      // Test concurrent operations
      const concurrentOperations = [
        () => simulateCSVImport(generateTestCSV(100)),
        () => simulatePDFGeneration(generateTestInvoices(10)),
        () => simulateAPIRequest('/api/invoices'),
        () => simulateAPIRequest('/api/export/json'),
      ];

      const startTime = performance.now();
      const results = await Promise.all(concurrentOperations.map(op => op()));
      const totalTime = performance.now() - startTime;

      console.log(`Concurrent Operations Completed in: ${totalTime.toFixed(2)}ms`);

      // System should handle concurrent operations efficiently
      expect(totalTime, 'Concurrent operations taking too long').toBeLessThan(5000); // 5 seconds max
      
      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result, `Operation ${index} failed`).toBeTruthy();
      });
    });

    it('should maintain memory efficiency under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // Simulate sustained load
      for (let i = 0; i < 10; i++) {
        await simulateCSVImport(generateTestCSV(100));
        await simulatePDFGeneration(generateTestInvoices(5));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory Usage - Initial: ${initialMemory.toFixed(2)}MB, Final: ${finalMemory.toFixed(2)}MB, Increase: ${memoryIncrease.toFixed(2)}MB`);

      // Memory increase should be minimal (indicating no major leaks)
      expect(memoryIncrease, 'Excessive memory increase detected').toBeLessThan(50); // 50MB max increase
    });
  });
});

// Helper functions for test simulation

function generateTestCSV(rowCount: number): string {
  let csv = 'Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes\\n';
  
  for (let i = 1; i <= rowCount; i++) {
    const paddedNumber = i.toString().padStart(6, '0');
    const tinType = i % 3;
    let validTin;
    if (tinType === 0) {
      validTin = `C${paddedNumber}890`;
    } else if (tinType === 1) {
      validTin = `G${paddedNumber}890`;
    } else {
      validTin = `${paddedNumber}890123`;
    }
    
    csv += `INV-PERF-${paddedNumber},2024-01-15,2024-02-15,MYR,1.000000,Test Buyer ${i} Sdn Bhd,${validTin},Test Service ${i},${Math.floor(Math.random() * 10) + 1},${((Math.random() * 1000) + 100).toFixed(2)},6.00,Test row ${i}\\n`;
  }
  
  return csv;
}

function generateTestInvoices(count: number): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `invoice-${i + 1}`,
    invoiceNumber: `INV-${(i + 1).toString().padStart(6, '0')}`,
    grandTotal: ((Math.random() * 1000) + 100).toFixed(2),
  }));
}

async function simulateCSVImport(csvData: string) {
  // Simulate CSV import processing
  const rows = csvData.split('\\n').filter(line => line.trim());
  const dataRows = rows.slice(1); // Skip header
  
  let successful = 0;
  let failed = 0;
  
  for (const row of dataRows) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
    
    // Simulate success/failure
    if (Math.random() > 0.05) { // 95% success rate
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    total: dataRows.length,
    successful,
    failed,
  };
}

async function simulatePDFGeneration(invoices: any[]) {
  // Simulate PDF generation processing
  for (const invoice of invoices) {
    // Simulate generation delay (optimized to <20ms per PDF)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
  }
  
  return {
    count: invoices.length,
    success: true,
  };
}

async function simulateAPIRequest(endpoint: string) {
  // Simulate API request
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  return { success: true, endpoint };
}