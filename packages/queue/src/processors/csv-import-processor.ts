// CSV Import Job Processor for Easy e-Invoice
// Handles large CSV file processing with Malaysian e-Invoice validation

import { JobProcessor, Job, JobResult, CsvImportPayload } from '../types';

export class CsvImportProcessor implements JobProcessor {
  constructor(
    private storage: R2Bucket,
    private database: any, // Database connection
    private validationService: any // Malaysian validation service
  ) {}

  async process(job: Job): Promise<JobResult> {
    const payload = job.payload as CsvImportPayload;
    
    try {
      // Step 1: Download and parse CSV file
      await this.updateProgress(job, 10, 'Downloading CSV file');
      const csvData = await this.downloadCsvFile(payload.fileKey);
      
      await this.updateProgress(job, 20, 'Parsing CSV data');
      const rows = await this.parseCsvData(csvData, payload.columnMapping);
      
      // Step 2: Validate data structure
      await this.updateProgress(job, 30, 'Validating data structure');
      const validationResults = await this.validateDataStructure(rows);
      
      if (validationResults.criticalErrors.length > 0) {
        throw new Error(`Critical validation errors: ${validationResults.criticalErrors.join(', ')}`);
      }
      
      // Step 3: Process in batches
      await this.updateProgress(job, 40, 'Processing invoice data');
      const results = await this.processBatches(rows, payload, job);
      
      // Step 4: Generate summary report
      await this.updateProgress(job, 90, 'Generating import report');
      const reportUrl = await this.generateImportReport(results, payload);
      
      await this.updateProgress(job, 100, 'Import completed');
      
      return {
        success: true,
        data: {
          totalRows: rows.length,
          importedInvoices: results.successful.length,
          skippedRows: results.skipped.length,
          reportUrl
        },
        statistics: {
          processed: rows.length,
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        warnings: validationResults.warnings,
        outputFiles: [{
          key: `reports/csv-import-${job.id}.pdf`,
          url: reportUrl,
          size: 0, // Will be set by report generator
          type: 'application/pdf'
        }]
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during CSV import',
        statistics: {
          processed: 0,
          successful: 0,
          failed: 1,
          skipped: 0
        }
      };
    }
  }

  async getEstimatedDuration(payload: CsvImportPayload): Promise<number> {
    // Estimate based on file size
    // Approximate: 1MB = 30 seconds processing time
    const baseDuration = Math.max(30000, payload.fileSize * 30); // 30ms per byte minimum 30s
    
    // Add complexity factors
    let complexityMultiplier = 1;
    
    if (payload.validationRules && payload.validationRules.length > 5) {
      complexityMultiplier += 0.5; // Additional validation rules
    }
    
    if (payload.batchSize < 50) {
      complexityMultiplier += 0.3; // Smaller batches = more overhead
    }
    
    return Math.round(baseDuration * complexityMultiplier);
  }

  async validatePayload(payload: unknown): Promise<boolean> {
    try {
      const csvPayload = payload as CsvImportPayload;
      
      // Validate required fields
      if (!csvPayload.fileKey || !csvPayload.fileName || !csvPayload.columnMapping) {
        return false;
      }
      
      // Validate file exists in storage
      const fileExists = await this.checkFileExists(csvPayload.fileKey);
      if (!fileExists) {
        return false;
      }
      
      // Validate column mapping
      const requiredColumns = ['customerName', 'amount', 'currency'];
      const mappedColumns = Object.values(csvPayload.columnMapping);
      
      for (const required of requiredColumns) {
        if (!mappedColumns.includes(required)) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods
  private async downloadCsvFile(fileKey: string): Promise<string> {
    const object = await this.storage.get(fileKey);
    if (!object) {
      throw new Error(`File not found: ${fileKey}`);
    }
    
    return await object.text();
  }

  private async parseCsvData(csvData: string, columnMapping: Record<string, string>): Promise<any[]> {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        const mappedField = columnMapping[header];
        if (mappedField && values[index]) {
          row[mappedField] = values[index];
        }
      });
      
      if (Object.keys(row).length > 0) {
        rows.push({ rowNumber: i + 1, data: row });
      }
    }
    
    return rows;
  }

  private async validateDataStructure(rows: any[]): Promise<{
    criticalErrors: string[];
    warnings: string[];
  }> {
    const criticalErrors: string[] = [];
    const warnings: string[] = [];
    
    if (rows.length === 0) {
      criticalErrors.push('No valid data rows found');
      return { criticalErrors, warnings };
    }
    
    // Check for required fields in first few rows
    const sampleSize = Math.min(5, rows.length);
    const requiredFields = ['customerName', 'amount', 'currency'];
    
    for (let i = 0; i < sampleSize; i++) {
      const row = rows[i];
      for (const field of requiredFields) {
        if (!row.data[field]) {
          warnings.push(`Row ${row.rowNumber}: Missing required field '${field}'`);
        }
      }
      
      // Validate amount format
      if (row.data.amount && isNaN(parseFloat(row.data.amount))) {
        warnings.push(`Row ${row.rowNumber}: Invalid amount format '${row.data.amount}'`);
      }
      
      // Validate currency format
      if (row.data.currency && !['MYR', 'USD', 'SGD', 'EUR', 'GBP'].includes(row.data.currency)) {
        warnings.push(`Row ${row.rowNumber}: Unsupported currency '${row.data.currency}'`);
      }
    }
    
    return { criticalErrors, warnings };
  }

  private async processBatches(
    rows: any[], 
    payload: CsvImportPayload, 
    job: Job
  ): Promise<{
    successful: any[];
    failed: any[];
    skipped: any[];
  }> {
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };
    
    const batchSize = payload.batchSize || 100;
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, rows.length);
      const batch = rows.slice(startIndex, endIndex);
      
      const progress = 40 + (50 * (batchIndex + 1) / totalBatches);
      await this.updateProgress(job, progress, `Processing batch ${batchIndex + 1}/${totalBatches}`);
      
      for (const row of batch) {
        try {
          // Validate Malaysian e-Invoice rules
          const validationResult = await this.validateMalaysianRules(row.data);
          
          if (!validationResult.isValid) {
            results.failed.push({
              rowNumber: row.rowNumber,
              data: row.data,
              error: validationResult.errors.join(', ')
            });
            continue;
          }
          
          // Create invoice record
          const invoice = await this.createInvoice(row.data, payload.organizationId);
          
          results.successful.push({
            rowNumber: row.rowNumber,
            invoiceId: invoice.id,
            data: row.data
          });
          
        } catch (error) {
          results.failed.push({
            rowNumber: row.rowNumber,
            data: row.data,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    return results;
  }

  private async validateMalaysianRules(data: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // TIN validation
    if (data.customerTin) {
      const tinValid = await this.validationService.validateTin(data.customerTin);
      if (!tinValid) {
        errors.push('Invalid Malaysian TIN format');
      }
    }
    
    // SST calculation validation
    if (data.sstAmount && data.amount) {
      const expectedSst = parseFloat(data.amount) * 0.06; // 6% SST
      const actualSst = parseFloat(data.sstAmount);
      
      if (Math.abs(expectedSst - actualSst) > 0.01) {
        warnings.push('SST amount does not match 6% calculation');
      }
    }
    
    // Currency validation for non-MYR
    if (data.currency !== 'MYR' && !data.exchangeRate) {
      errors.push('Exchange rate required for non-MYR invoices');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async createInvoice(data: any, organizationId: string): Promise<{ id: string }> {
    // This would integrate with the actual database
    // For now, return a mock invoice
    return {
      id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async generateImportReport(results: any, payload: CsvImportPayload): Promise<string> {
    // Generate PDF report with import results
    // This would integrate with a PDF generation service
    const reportKey = `reports/csv-import-${payload.organizationId}-${Date.now()}.pdf`;
    
    // Mock report generation
    const reportContent = `
      CSV Import Report
      ================
      File: ${payload.fileName}
      Total Rows: ${results.successful.length + results.failed.length + results.skipped.length}
      Successful: ${results.successful.length}
      Failed: ${results.failed.length}
      Skipped: ${results.skipped.length}
    `;
    
    await this.storage.put(reportKey, reportContent);
    
    return `https://files.easyeinvoice.com.my/${reportKey}`;
  }

  private async checkFileExists(fileKey: string): Promise<boolean> {
    try {
      const object = await this.storage.head(fileKey);
      return object !== null;
    } catch {
      return false;
    }
  }

  private async updateProgress(job: Job, percentage: number, message: string): Promise<void> {
    // This would be called through the job queue to update progress
    console.log(`Job ${job.id}: ${percentage}% - ${message}`);
  }
}