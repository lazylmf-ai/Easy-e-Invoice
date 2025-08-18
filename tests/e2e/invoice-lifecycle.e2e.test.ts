import { describe, it, expect } from 'vitest';
import { page, authHelpers, organizationHelpers, invoiceHelpers, utils, E2E_CONFIG } from './setup';

describe('Invoice Lifecycle E2E Tests', () => {
  // Setup: Login and complete organization setup before each test
  beforeEach(async () => {
    await authHelpers.login();
    await organizationHelpers.completeOnboarding();
  });

  describe('Invoice Creation Flow', () => {
    it('should create a complete invoice with Malaysian compliance', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Verify invoice creation page
      await expect(page.locator('h1')).toContainText('Create Invoice');
      
      // Fill invoice header
      const invoiceNumber = `INV-E2E-${Date.now()}`;
      await page.fill('input[name="invoiceNumber"]', invoiceNumber);
      await page.fill('input[name="issueDate"]', '2024-01-15');
      await page.fill('input[name="dueDate"]', '2024-02-15');
      
      // Select invoice type
      await page.selectOption('select[name="eInvoiceType"]', '01'); // Standard invoice
      
      // Fill buyer information
      await page.fill('input[name="buyerName"]', 'Test Buyer Sdn Bhd');
      await page.fill('input[name="buyerTin"]', 'C9876543210');
      await page.fill('input[name="buyerEmail"]', 'buyer@example.com');
      
      // Add buyer address
      await page.fill('input[name="buyerAddress.line1"]', '456 Buyer Street');
      await page.fill('input[name="buyerAddress.city"]', 'Kuala Lumpur');
      await page.selectOption('select[name="buyerAddress.state"]', 'Kuala Lumpur');
      await page.fill('input[name="buyerAddress.postcode"]', '50100');
      
      // Add first line item
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Professional Consulting Services');
      await page.fill('input[name="lineItems.0.quantity"]', '10');
      await page.fill('input[name="lineItems.0.unitPrice"]', '150.00');
      await page.fill('input[name="lineItems.0.sstRate"]', '6.00');
      
      // Verify auto-calculations
      await utils.waitForLoadingToComplete();
      await expect(page.locator('input[name="lineItems.0.lineTotal"]')).toHaveValue('1500.00');
      await expect(page.locator('input[name="lineItems.0.sstAmount"]')).toHaveValue('90.00');
      
      // Add second line item
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.1.itemDescription"]', 'Software License');
      await page.fill('input[name="lineItems.1.quantity"]', '1');
      await page.fill('input[name="lineItems.1.unitPrice"]', '500.00');
      await page.fill('input[name="lineItems.1.sstRate"]', '6.00');
      
      // Verify totals update
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="subtotal"]')).toContainText('2000.00');
      await expect(page.locator('[data-testid="total-sst"]')).toContainText('120.00');
      await expect(page.locator('[data-testid="grand-total"]')).toContainText('2120.00');
      
      // Add notes
      await page.fill('textarea[name="notes"]', 'E2E test invoice with multiple line items');
      
      // Save as draft first
      await page.click('[data-testid="save-draft"]');
      
      // Wait for save confirmation
      await expect(page.locator('text=Invoice saved as draft')).toBeVisible({ timeout: 10000 });
      
      // Verify we're on invoice detail page
      await page.waitForURL(`**/invoices/**`);
      await expect(page.locator('[data-testid="invoice-number"]')).toContainText(invoiceNumber);
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Draft');
      
      await utils.takeScreenshot('invoice-created-draft');
    });

    it('should validate Malaysian compliance during creation', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Create invoice with compliance issues
      await page.fill('input[name="invoiceNumber"]', `INV-INVALID-${Date.now()}`);
      await page.fill('input[name="issueDate"]', '2024-01-15');
      
      // Set foreign currency without proper exchange rate
      await page.selectOption('select[name="currency"]', 'USD');
      await page.fill('input[name="exchangeRate"]', '1.000000'); // Invalid for USD
      
      // Add buyer with invalid TIN
      await page.fill('input[name="buyerName"]', 'Invalid Buyer');
      await page.fill('input[name="buyerTin"]', 'INVALID123'); // Invalid TIN format
      
      // Add line item with incorrect SST calculation
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Test Service');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '1000.00');
      await page.fill('input[name="lineItems.0.sstRate"]', '6.00');
      
      // Manually override SST amount to incorrect value
      await page.fill('input[name="lineItems.0.sstAmount"]', '50.00'); // Should be 60.00
      
      // Attempt to save
      await page.click('[data-testid="save-draft"]');
      
      // Should show validation warnings
      await expect(page.locator('[data-testid="validation-panel"]')).toBeVisible();
      await expect(page.locator('text=Exchange rate required')).toBeVisible();
      await expect(page.locator('text=TIN format invalid')).toBeVisible();
      await expect(page.locator('text=SST calculation incorrect')).toBeVisible();
      
      // Validation score should be low
      const validationScore = page.locator('[data-testid="validation-score"]');
      await expect(validationScore).toBeVisible();
      
      const scoreText = await validationScore.textContent();
      const score = parseInt(scoreText || '0');
      expect(score).toBeLessThan(90);
      
      await utils.takeScreenshot('validation-warnings');
    });

    it('should handle B2C consolidation restrictions', async () => {
      // First, update organization to prohibited industry
      await page.goto(`${E2E_CONFIG.baseUrl}/org/profile`);
      await page.selectOption('select[name="industryCode"]', '35101'); // Electric power (prohibited)
      await page.click('button[type="submit"]');
      
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Try to create consolidated invoice
      await page.fill('input[name="invoiceNumber"]', `INV-CONSOL-${Date.now()}`);
      await page.check('input[name="isConsolidated"]');
      await page.fill('input[name="consolidationPeriod"]', '2024-01');
      
      // Add line item
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Electricity Supply');
      await page.fill('input[name="lineItems.0.quantity"]', '1000');
      await page.fill('input[name="lineItems.0.unitPrice"]', '0.50');
      
      await page.click('[data-testid="save-draft"]');
      
      // Should show B2C consolidation error
      await expect(page.locator('text=Industry not eligible for B2C consolidation')).toBeVisible();
      await expect(page.locator('text=Issue individual invoices')).toBeVisible();
    });
  });

  describe('Invoice Validation and Approval', () => {
    it('should validate invoice and improve compliance score', async () => {
      // Create a basic invoice first
      await invoiceHelpers.createBasicInvoice();
      
      // Get current URL to extract invoice ID
      const currentUrl = page.url();
      const invoiceId = currentUrl.split('/').pop();
      
      // Run validation
      await page.click('[data-testid="validate-invoice"]');
      
      // Wait for validation to complete
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible({ timeout: 15000 });
      
      // Check validation score
      const initialScore = await page.locator('[data-testid="validation-score"]').textContent();
      expect(parseInt(initialScore || '0')).toBeGreaterThan(0);
      
      // Fix validation issues if any
      const validationIssues = page.locator('[data-testid="validation-issue"]');
      const issueCount = await validationIssues.count();
      
      if (issueCount > 0) {
        // Click on first issue to see details
        await validationIssues.first().click();
        
        // Should show fix suggestion
        await expect(page.locator('[data-testid="fix-suggestion"]')).toBeVisible();
        
        // Apply suggested fix if available
        const fixButton = page.locator('[data-testid="apply-fix"]');
        if (await fixButton.isVisible()) {
          await fixButton.click();
          
          // Re-validate
          await page.click('[data-testid="validate-invoice"]');
          await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
          
          // Score should improve
          const newScore = await page.locator('[data-testid="validation-score"]').textContent();
          expect(parseInt(newScore || '0')).toBeGreaterThanOrEqual(parseInt(initialScore || '0'));
        }
      }
      
      await utils.takeScreenshot('invoice-validated');
    });

    it('should submit invoice for approval when validation passes', async () => {
      await invoiceHelpers.createBasicInvoice();
      
      // Ensure invoice is validated with good score
      await page.click('[data-testid="validate-invoice"]');
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
      
      const score = await page.locator('[data-testid="validation-score"]').textContent();
      if (parseInt(score || '0') >= 90) {
        // Submit for approval
        await page.click('[data-testid="submit-for-approval"]');
        
        // Confirm submission
        await page.click('[data-testid="confirm-submission"]');
        
        // Wait for status update
        await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Submitted', { timeout: 10000 });
        
        // Should show submission confirmation
        await expect(page.locator('text=Invoice submitted successfully')).toBeVisible();
      }
    });
  });

  describe('Invoice Management', () => {
    it('should display invoice list with filtering and sorting', async () => {
      // Create multiple invoices for testing
      await invoiceHelpers.createBasicInvoice();
      await invoiceHelpers.createBasicInvoice();
      
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices`);
      
      // Verify invoice list page
      await expect(page.locator('h1')).toContainText('Invoices');
      await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
      
      // Check pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      
      // Test search functionality
      await page.fill('input[name="search"]', 'INV-E2E');
      await page.click('[data-testid="search-button"]');
      
      // Wait for filtered results
      await utils.waitForLoadingToComplete();
      
      // All visible invoices should contain search term
      const invoiceRows = page.locator('[data-testid="invoice-row"]');
      const count = await invoiceRows.count();
      
      for (let i = 0; i < count; i++) {
        const invoiceNumber = await invoiceRows.nth(i).locator('[data-testid="invoice-number"]').textContent();
        expect(invoiceNumber).toContain('INV-E2E');
      }
      
      // Test status filtering
      await page.selectOption('select[name="status"]', 'draft');
      await page.click('[data-testid="apply-filters"]');
      
      await utils.waitForLoadingToComplete();
      
      // All visible invoices should be draft status
      const statusCells = page.locator('[data-testid="invoice-status"]');
      const statusCount = await statusCells.count();
      
      for (let i = 0; i < statusCount; i++) {
        const status = await statusCells.nth(i).textContent();
        expect(status?.toLowerCase()).toContain('draft');
      }
      
      // Test date range filtering
      await page.fill('input[name="dateFrom"]', '2024-01-01');
      await page.fill('input[name="dateTo"]', '2024-12-31');
      await page.click('[data-testid="apply-filters"]');
      
      await utils.waitForLoadingToComplete();
      
      await utils.takeScreenshot('invoice-list-filtered');
    });

    it('should handle bulk operations on invoices', async () => {
      // Create multiple invoices
      await invoiceHelpers.createBasicInvoice();
      await invoiceHelpers.createBasicInvoice();
      
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices`);
      
      // Select multiple invoices
      await page.check('[data-testid="invoice-checkbox"]:nth-of-type(1)');
      await page.check('[data-testid="invoice-checkbox"]:nth-of-type(2)');
      
      // Bulk actions should be available
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Test bulk export
      await page.selectOption('select[name="bulkAction"]', 'export');
      await page.click('[data-testid="execute-bulk-action"]');
      
      // Should start download
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="confirm-bulk-export"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('invoices-export');
      
      // Test bulk validation
      await page.selectOption('select[name="bulkAction"]', 'validate');
      await page.click('[data-testid="execute-bulk-action"]');
      
      // Should show bulk validation progress
      await expect(page.locator('[data-testid="bulk-validation-progress"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('text=Bulk validation completed')).toBeVisible({ timeout: 30000 });
    });
  });

  describe('Credit and Debit Notes', () => {
    it('should create credit note from existing invoice', async () => {
      // Create original invoice first
      await invoiceHelpers.createBasicInvoice();
      const currentUrl = page.url();
      const originalInvoiceId = currentUrl.split('/').pop();
      
      // Create credit note
      await page.click('[data-testid="create-credit-note"]');
      
      // Verify credit note form pre-filled
      await expect(page.locator('select[name="eInvoiceType"]')).toHaveValue('02'); // Credit note
      await expect(page.locator('input[name="referenceInvoiceId"]')).toHaveValue(originalInvoiceId || '');
      
      // Fill credit note details
      const creditNoteNumber = `CN-${Date.now()}`;
      await page.fill('input[name="invoiceNumber"]', creditNoteNumber);
      await page.fill('input[name="issueDate"]', '2024-01-20');
      
      // Adjust line items (partial credit)
      await page.fill('input[name="lineItems.0.quantity"]', '0.5'); // Half the original quantity
      
      // Save credit note
      await page.click('[data-testid="save-draft"]');
      
      // Verify credit note created
      await expect(page.locator('[data-testid="invoice-number"]')).toContainText(creditNoteNumber);
      await expect(page.locator('[data-testid="invoice-type"]')).toContainText('Credit Note');
      await expect(page.locator('[data-testid="reference-invoice"]')).toContainText(originalInvoiceId || '');
      
      // Verify negative amount
      const grandTotal = await page.locator('[data-testid="grand-total"]').textContent();
      expect(grandTotal).toContain('-'); // Should be negative for credit note
    });

    it('should enforce credit note validation rules', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Try to create credit note without reference
      await page.selectOption('select[name="eInvoiceType"]', '02'); // Credit note
      await page.fill('input[name="invoiceNumber"]', `CN-INVALID-${Date.now()}`);
      
      // Add line item
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Credit adjustment');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '100.00');
      
      // Try to save without reference invoice
      await page.click('[data-testid="save-draft"]');
      
      // Should show validation error
      await expect(page.locator('text=Credit note must reference original invoice')).toBeVisible();
      await expect(page.locator('[data-testid="validation-score"]')).toContainText('0'); // Should fail validation
    });
  });

  describe('Invoice Templates Integration', () => {
    it('should use template to create new invoice', async () => {
      // Create a template first
      const templateName = `Template-${Date.now()}`;
      await page.goto(`${E2E_CONFIG.baseUrl}/templates/create`);
      
      await page.fill('input[name="name"]', templateName);
      await page.fill('textarea[name="description"]', 'E2E test template');
      
      // Add template line items
      await page.click('[data-testid="add-line-item"]');
      await page.fill('input[name="lineItems.0.itemDescription"]', 'Monthly Consulting');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '2000.00');
      await page.fill('input[name="lineItems.0.sstRate"]', '6.00');
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Template created successfully')).toBeVisible();
      
      // Now use template to create invoice
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
      
      // Select template
      await page.click('[data-testid="use-template"]');
      await page.selectOption('select[name="templateId"]', templateName);
      await page.click('[data-testid="apply-template"]');
      
      // Verify form populated from template
      await expect(page.locator('input[name="lineItems.0.itemDescription"]')).toHaveValue('Monthly Consulting');
      await expect(page.locator('input[name="lineItems.0.unitPrice"]')).toHaveValue('2000.00');
      
      // Complete invoice creation
      const invoiceNumber = `INV-FROM-TEMPLATE-${Date.now()}`;
      await page.fill('input[name="invoiceNumber"]', invoiceNumber);
      await page.fill('input[name="issueDate"]', '2024-01-15');
      
      // Add buyer info
      await page.fill('input[name="buyerName"]', 'Template Test Buyer');
      await page.fill('input[name="buyerTin"]', 'C1111111111');
      
      await page.click('[data-testid="save-draft"]');
      
      await expect(page.locator('[data-testid="invoice-number"]')).toContainText(invoiceNumber);
      await utils.takeScreenshot('invoice-from-template');
    });
  });
});