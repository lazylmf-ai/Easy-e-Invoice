import { describe, it, expect } from 'vitest';
import { page, authHelpers, organizationHelpers, importExportHelpers, utils, E2E_CONFIG } from './setup';

describe('Import/Export Flow E2E Tests', () => {
  beforeEach(async () => {
    await authHelpers.login();
    await organizationHelpers.completeOnboarding();
  });

  describe('CSV Import Flow', () => {
    it('should successfully import valid CSV invoice data', async () => {
      const csvData = `Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes
INV-CSV-001,2024-01-15,2024-02-15,MYR,1.000000,CSV Test Buyer Sdn Bhd,C1111111111,Professional Consulting Services,5,200.00,6.00,Imported from CSV
INV-CSV-002,2024-01-16,2024-02-16,MYR,1.000000,Another Buyer Sdn Bhd,C2222222222,Software Development,10,150.00,6.00,Second CSV import
INV-CSV-003,2024-01-17,2024-02-17,USD,4.350000,US Buyer Corp,123456789012,International Consulting,2,500.00,0.00,USD invoice import`;

      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      // Verify import page
      await expect(page.locator('h1')).toContainText('Import Invoices');
      await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
      
      // Upload CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-invoices.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvData)
      });
      
      // Verify file selected
      await expect(page.locator('[data-testid="selected-file"]')).toContainText('test-invoices.csv');
      
      // Start import
      await page.click('[data-testid="start-import"]');
      
      // Wait for import progress
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 30000 });
      
      // Verify import results
      const importSummary = page.locator('[data-testid="import-summary"]');
      await expect(importSummary).toBeVisible();
      
      await expect(page.locator('[data-testid="total-rows"]')).toContainText('3');
      await expect(page.locator('[data-testid="successful-imports"]')).toContainText('3');
      await expect(page.locator('[data-testid="failed-imports"]')).toContainText('0');
      
      // Check detailed results
      const resultRows = page.locator('[data-testid="import-result-row"]');
      await expect(resultRows).toHaveCount(3);
      
      // Verify first import result
      await expect(resultRows.nth(0).locator('[data-testid="invoice-number"]')).toContainText('INV-CSV-001');
      await expect(resultRows.nth(0).locator('[data-testid="import-status"]')).toContainText('Success');
      
      // Navigate to imported invoices
      await page.click('[data-testid="view-imported-invoices"]');
      
      await page.waitForURL('**/invoices**');
      
      // Search for imported invoices
      await page.fill('input[name="search"]', 'INV-CSV');
      await page.click('[data-testid="search-button"]');
      
      await utils.waitForLoadingToComplete();
      
      // Should see 3 imported invoices
      const invoiceRows = page.locator('[data-testid="invoice-row"]');
      await expect(invoiceRows).toHaveCount(3);
      
      await utils.takeScreenshot('csv-import-success');
    });

    it('should handle CSV import with validation errors', async () => {
      const invalidCsvData = `Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes
INV-INVALID-001,invalid-date,2024-02-15,MYR,1.000000,Invalid Buyer,BADTIN123,Service,1,100.00,6.00,Invalid date
INV-INVALID-002,2024-01-15,2024-02-15,USD,1.000000,USD Buyer,C3333333333,Service,abc,100.00,6.00,Invalid quantity
INV-INVALID-003,2024-01-15,2024-02-15,EUR,invalid-rate,Euro Buyer,C4444444444,Service,1,invalid-price,6.00,Invalid amounts`;

      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid-invoices.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(invalidCsvData)
      });
      
      await page.click('[data-testid="start-import"]');
      
      await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 30000 });
      
      // Should show validation errors
      await expect(page.locator('[data-testid="total-rows"]')).toContainText('3');
      await expect(page.locator('[data-testid="failed-imports"]')).toContainText('3');
      await expect(page.locator('[data-testid="successful-imports"]')).toContainText('0');
      
      // Check error details for each row
      const resultRows = page.locator('[data-testid="import-result-row"]');
      
      // First row - invalid date
      await expect(resultRows.nth(0).locator('[data-testid="import-status"]')).toContainText('Failed');
      await resultRows.nth(0).click();
      await expect(page.locator('[data-testid="error-details"]')).toContainText('Invalid date format');
      
      // Second row - invalid quantity and exchange rate
      await resultRows.nth(1).click();
      await expect(page.locator('[data-testid="error-details"]')).toContainText('quantity');
      await expect(page.locator('[data-testid="error-details"]')).toContainText('exchange rate');
      
      // Third row - invalid price
      await resultRows.nth(2).click();
      await expect(page.locator('[data-testid="error-details"]')).toContainText('unit price');
      
      await utils.takeScreenshot('csv-import-errors');
    });

    it('should handle large CSV file import with progress tracking', async () => {
      // Generate a larger CSV file (100 invoices)
      let csvData = 'Invoice Number,Issue Date,Due Date,Currency,Exchange Rate,Buyer Name,Buyer TIN,Item Description,Quantity,Unit Price,SST Rate,Notes\n';
      
      for (let i = 1; i <= 100; i++) {
        const paddedNumber = i.toString().padStart(3, '0');
        csvData += `INV-BULK-${paddedNumber},2024-01-${(i % 28) + 1 < 10 ? '0' + ((i % 28) + 1) : (i % 28) + 1},2024-02-${(i % 28) + 1 < 10 ? '0' + ((i % 28) + 1) : (i % 28) + 1},MYR,1.000000,Bulk Buyer ${i} Sdn Bhd,C${paddedNumber}7890123,Bulk Service ${i},${i % 10 + 1},${(i % 5 + 1) * 100}.00,6.00,Bulk import test ${i}\n`;
      }
      
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'bulk-invoices.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvData)
      });
      
      await page.click('[data-testid="start-import"]');
      
      // Monitor progress bar
      const progressBar = page.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toBeVisible();
      
      // Wait for progress to start
      await page.waitForFunction(() => {
        const progress = document.querySelector('[data-testid="progress-percentage"]');
        return progress && parseInt(progress.textContent || '0') > 0;
      }, { timeout: 10000 });
      
      // Wait for completion
      await expect(page.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 60000 });
      
      // Verify results
      await expect(page.locator('[data-testid="total-rows"]')).toContainText('100');
      await expect(page.locator('[data-testid="successful-imports"]')).toContainText('100');
      
      await utils.takeScreenshot('bulk-import-complete');
    });

    it('should validate CSV headers and format before import', async () => {
      const invalidHeaderCsv = `Wrong,Headers,Format
Value1,Value2,Value3
Another,Row,Here`;

      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'bad-headers.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(invalidHeaderCsv)
      });
      
      // Should show header validation error immediately
      await expect(page.locator('[data-testid="header-validation-error"]')).toBeVisible();
      await expect(page.locator('text=Required columns missing')).toBeVisible();
      
      // Import button should be disabled
      await expect(page.locator('[data-testid="start-import"]')).toBeDisabled();
      
      // Show required headers
      await expect(page.locator('[data-testid="required-headers"]')).toBeVisible();
      await expect(page.locator('text=Invoice Number')).toBeVisible();
      await expect(page.locator('text=Issue Date')).toBeVisible();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      // Create some test invoices for export
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Create first invoice
      await page.fill('input[name="invoiceNumber"]', `INV-EXPORT-001`);
      await page.fill('input[name="issueDate"]', '2024-01-15');
      await page.fill('input[name="buyerName"]', 'Export Test Buyer 1');
      await page.fill('input[name="buyerTin"]', 'C1111111111');
      
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Export Test Service 1');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '1000.00');
      
      await page.click('[data-testid="save-draft"]');
      await page.waitForURL('**/invoices/**');
      
      // Create second invoice
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      await page.fill('input[name="invoiceNumber"]', `INV-EXPORT-002`);
      await page.fill('input[name="issueDate"]', '2024-01-16');
      await page.fill('input[name="buyerName"]', 'Export Test Buyer 2');
      await page.fill('input[name="buyerTin"]', 'C2222222222');
      
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Export Test Service 2');
      await page.fill('input[name="lineItems.0.quantity"]', '2');
      await page.fill('input[name="lineItems.0.unitPrice"]', '500.00');
      
      await page.click('[data-testid="save-draft"]');
      await page.waitForURL('**/invoices/**');
    });

    it('should export invoices as CSV format', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/export`);
      
      // Verify export page
      await expect(page.locator('h1')).toContainText('Export Invoices');
      
      // Select CSV format
      await page.selectOption('select[name="format"]', 'csv');
      
      // Set date range to include test invoices
      await page.fill('input[name="dateFrom"]', '2024-01-01');
      await page.fill('input[name="dateTo"]', '2024-12-31');
      
      // Start download
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="export-button"]');
      
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('invoices-export');
      expect(download.suggestedFilename()).toContain('.csv');
      
      // Save and verify file content
      const downloadPath = `./tests/e2e/downloads/${download.suggestedFilename()}`;
      await download.saveAs(downloadPath);
      
      // Verify CSV content contains our test invoices
      const fs = require('fs');
      const csvContent = fs.readFileSync(downloadPath, 'utf8');
      expect(csvContent).toContain('INV-EXPORT-001');
      expect(csvContent).toContain('INV-EXPORT-002');
      expect(csvContent).toContain('Export Test Buyer 1');
      
      await utils.takeScreenshot('csv-export-complete');
    });

    it('should export invoices as MyInvois JSON format', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/export`);
      
      // Select MyInvois format
      await page.selectOption('select[name="format"]', 'myinvois');
      
      // Set filters
      await page.fill('input[name="dateFrom"]', '2024-01-01');
      await page.fill('input[name="dateTo"]', '2024-12-31');
      await page.selectOption('select[name="status"]', 'all');
      
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="export-button"]');
      
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('myinvois-export');
      expect(download.suggestedFilename()).toContain('.json');
      
      // Verify JSON structure
      const downloadPath = `./tests/e2e/downloads/${download.suggestedFilename()}`;
      await download.saveAs(downloadPath);
      
      const fs = require('fs');
      const jsonContent = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
      
      expect(jsonContent).toHaveProperty('documents');
      expect(jsonContent.documents).toBeInstanceOf(Array);
      expect(jsonContent).toHaveProperty('metadata');
      expect(jsonContent.metadata).toHaveProperty('version');
      expect(jsonContent.metadata).toHaveProperty('generatedAt');
      
      // Check document structure matches MyInvois format
      if (jsonContent.documents.length > 0) {
        const firstDoc = jsonContent.documents[0];
        expect(firstDoc).toHaveProperty('_D');
        expect(firstDoc).toHaveProperty('_A');
        expect(firstDoc).toHaveProperty('_B');
      }
    });

    it('should export single invoice as PDF', async () => {
      // Go to invoice list and select first test invoice
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices`);
      
      await page.fill('input[name="search"]', 'INV-EXPORT-001');
      await page.click('[data-testid="search-button"]');
      await utils.waitForLoadingToComplete();
      
      // Click on first invoice
      await page.click('[data-testid="invoice-row"]:first-child');
      
      // Export as PDF
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="export-pdf"]');
      
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('INV-EXPORT-001');
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // Verify file size (PDF should be reasonably sized)
      const downloadPath = `./tests/e2e/downloads/${download.suggestedFilename()}`;
      await download.saveAs(downloadPath);
      
      const fs = require('fs');
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(1000); // PDF should be at least 1KB
      
      await utils.takeScreenshot('pdf-export-complete');
    });

    it('should handle bulk export with filtering', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices`);
      
      // Select multiple invoices
      await page.check('[data-testid="select-all-invoices"]');
      
      // Verify bulk actions appear
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Bulk export
      await page.selectOption('select[name="bulkAction"]', 'export');
      await page.selectOption('select[name="exportFormat"]', 'csv');
      
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="execute-bulk-action"]');
      
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('bulk-export');
      expect(download.suggestedFilename()).toContain('.csv');
    });

    it('should export with custom date ranges and filters', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/export`);
      
      // Set specific date range
      await page.fill('input[name="dateFrom"]', '2024-01-15');
      await page.fill('input[name="dateTo"]', '2024-01-16');
      
      // Filter by status
      await page.selectOption('select[name="status"]', 'draft');
      
      // Filter by buyer
      await page.fill('input[name="buyerSearch"]', 'Export Test Buyer');
      
      // Export as JSON to verify filtering
      await page.selectOption('select[name="format"]', 'json');
      
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="export-button"]');
      
      const download = await downloadPromise;
      
      // Verify filtered export
      const downloadPath = `./tests/e2e/downloads/${download.suggestedFilename()}`;
      await download.saveAs(downloadPath);
      
      const fs = require('fs');
      const jsonContent = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
      
      // Should only contain invoices within date range
      expect(jsonContent.invoices.length).toBe(2);
      
      // Verify metadata includes filter information
      expect(jsonContent.metadata.filters).toMatchObject({
        dateFrom: '2024-01-15',
        dateTo: '2024-01-16',
        status: 'draft'
      });
    });
  });

  describe('Import/Export Error Handling', () => {
    it('should handle file upload errors gracefully', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      // Try to upload non-CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'not-a-csv.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is not a CSV file')
      });
      
      // Should show file type error
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
      await expect(page.locator('text=Only CSV files are supported')).toBeVisible();
      
      // Import button should be disabled
      await expect(page.locator('[data-testid="start-import"]')).toBeDisabled();
    });

    it('should handle export failures gracefully', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/export`);
      
      // Try to export with invalid date range
      await page.fill('input[name="dateFrom"]', '2024-12-31');
      await page.fill('input[name="dateTo"]', '2024-01-01'); // End before start
      
      await page.click('[data-testid="export-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="date-range-error"]')).toBeVisible();
      await expect(page.locator('text=End date must be after start date')).toBeVisible();
    });

    it('should handle network errors during import/export', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
      
      // Upload valid CSV
      const csvData = 'Invoice Number,Issue Date,Item Description\nINV-001,2024-01-15,Test Service';
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvData)
      });
      
      // Simulate network failure
      await page.context().setOffline(true);
      
      await page.click('[data-testid="start-import"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('text=Network error')).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
      
      // Should be able to retry
      await page.click('[data-testid="retry-import"]');
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    });
  });
});