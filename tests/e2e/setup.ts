import { Page, Browser, chromium, firefox, webkit } from 'playwright';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

declare global {
  var browser: Browser;
  var page: Page;
}

export const E2E_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.E2E_API_URL || 'http://localhost:8787',
  timeout: 30000,
  slowMo: 100, // Slow down actions for debugging
};

beforeAll(async () => {
  // Launch browser (can be configured for different browsers)
  const browserType = process.env.E2E_BROWSER || 'chromium';
  
  switch (browserType) {
    case 'firefox':
      global.browser = await firefox.launch({ 
        headless: process.env.E2E_HEADLESS !== 'false',
        slowMo: E2E_CONFIG.slowMo 
      });
      break;
    case 'webkit':
      global.browser = await webkit.launch({ 
        headless: process.env.E2E_HEADLESS !== 'false',
        slowMo: E2E_CONFIG.slowMo 
      });
      break;
    default:
      global.browser = await chromium.launch({ 
        headless: process.env.E2E_HEADLESS !== 'false',
        slowMo: E2E_CONFIG.slowMo 
      });
  }
});

beforeEach(async () => {
  // Create a new page for each test
  global.page = await global.browser.newPage();
  
  // Set default timeouts
  global.page.setDefaultTimeout(E2E_CONFIG.timeout);
  global.page.setDefaultNavigationTimeout(E2E_CONFIG.timeout);
  
  // Set viewport
  await global.page.setViewportSize({ width: 1280, height: 720 });
});

afterEach(async () => {
  if (global.page) {
    await global.page.close();
  }
});

afterAll(async () => {
  if (global.browser) {
    await global.browser.close();
  }
});

// Helper functions for common E2E operations
export const authHelpers = {
  async login(email: string = 'test@example.com') {
    await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
    
    // Fill email and submit
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    
    // Wait for magic link sent confirmation
    await page.waitForSelector('text=magic link has been sent', { timeout: 10000 });
    
    // For E2E testing, we would need to either:
    // 1. Use a test email service to retrieve the actual magic link
    // 2. Use a test endpoint that generates a valid token
    // 3. Mock the email service in test environment
    
    // For now, we'll assume there's a test endpoint that provides a magic link
    const testToken = await getTestMagicLinkToken(email);
    
    // Navigate to verification with test token
    await page.goto(`${E2E_CONFIG.baseUrl}/auth/verify?token=${testToken}`);
    
    // Wait for successful login redirect
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  },

  async logout() {
    // Look for logout button or user menu
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('[data-testid="logout-button"]');
    } else {
      // Fallback: go to logout URL directly
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/logout`);
    }
    
    // Wait for redirect to login page
    await page.waitForURL('**/auth/login');
  }
};

export const organizationHelpers = {
  async completeOnboarding() {
    // Navigate to organization setup
    await page.goto(`${E2E_CONFIG.baseUrl}/org/setup`);
    
    // Fill organization details
    await page.fill('input[name="name"]', 'Test Company Sdn Bhd');
    await page.fill('input[name="tin"]', 'C1234567890');
    await page.selectOption('select[name="industryCode"]', '62010'); // IT Services
    await page.check('input[name="isSstRegistered"]');
    
    // Fill address
    await page.fill('input[name="address.line1"]', '123 Business Street');
    await page.fill('input[name="address.city"]', 'Kuala Lumpur');
    await page.selectOption('select[name="address.state"]', 'Kuala Lumpur');
    await page.fill('input[name="address.postcode"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success confirmation
    await page.waitForSelector('text=Organization setup completed', { timeout: 15000 });
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
  }
};

export const invoiceHelpers = {
  async createBasicInvoice() {
    // Navigate to invoice creation
    await page.goto(`${E2E_CONFIG.baseUrl}/invoices/create`);
    
    // Fill basic invoice details
    await page.fill('input[name="invoiceNumber"]', `INV-E2E-${Date.now()}`);
    await page.fill('input[name="issueDate"]', '2024-01-15');
    await page.fill('input[name="dueDate"]', '2024-02-15');
    
    // Fill buyer information
    await page.fill('input[name="buyerName"]', 'Test Buyer Sdn Bhd');
    await page.fill('input[name="buyerTin"]', 'C9876543210');
    await page.fill('input[name="buyerEmail"]', 'buyer@example.com');
    
    // Add line item
    await page.click('[data-testid="add-line-item"]');
    await page.fill('input[name="lineItems.0.itemDescription"]', 'Professional Consulting Services');
    await page.fill('input[name="lineItems.0.quantity"]', '1');
    await page.fill('input[name="lineItems.0.unitPrice"]', '1000.00');
    await page.fill('input[name="lineItems.0.sstRate"]', '6.00');
    
    // Submit invoice
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('text=Invoice created successfully', { timeout: 15000 });
    
    // Should redirect to invoice detail or list
    await page.waitForURL('**/invoices/**');
  },

  async validateInvoice(invoiceId: string) {
    await page.goto(`${E2E_CONFIG.baseUrl}/invoices/${invoiceId}`);
    
    // Click validate button
    await page.click('[data-testid="validate-invoice"]');
    
    // Wait for validation to complete
    await page.waitForSelector('[data-testid="validation-results"]', { timeout: 10000 });
    
    // Return validation score
    const scoreElement = page.locator('[data-testid="validation-score"]');
    const score = await scoreElement.textContent();
    return parseInt(score || '0');
  }
};

export const templateHelpers = {
  async createTemplate(templateName: string) {
    await page.goto(`${E2E_CONFIG.baseUrl}/templates/create`);
    
    // Fill template details
    await page.fill('input[name="name"]', templateName);
    await page.fill('textarea[name="description"]', `Template for ${templateName}`);
    
    // Fill invoice template data
    await page.fill('input[name="issueDate"]', '2024-01-15');
    await page.fill('input[name="dueDate"]', '2024-02-15');
    
    // Add line item
    await page.click('[data-testid="add-line-item"]');
    await page.fill('input[name="lineItems.0.itemDescription"]', 'Template Service');
    await page.fill('input[name="lineItems.0.quantity"]', '1');
    await page.fill('input[name="lineItems.0.unitPrice"]', '1000.00');
    await page.fill('input[name="lineItems.0.sstRate"]', '6.00');
    
    // Save template
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=Template created successfully', { timeout: 10000 });
  }
};

export const importExportHelpers = {
  async importCsv(csvContent: string) {
    await page.goto(`${E2E_CONFIG.baseUrl}/invoices/import`);
    
    // Create a file with CSV content
    const dataTransfer = await page.evaluateHandle((content) => {
      const dt = new DataTransfer();
      const file = new File([content], 'test-invoices.csv', { type: 'text/csv' });
      dt.items.add(file);
      return dt;
    }, csvContent);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'test-invoices.csv', mimeType: 'text/csv', buffer: Buffer.from(csvContent) });
    
    // Submit import
    await page.click('button[type="submit"]');
    
    // Wait for import completion
    await page.waitForSelector('[data-testid="import-results"]', { timeout: 30000 });
  },

  async exportInvoices(format: 'csv' | 'json' | 'pdf') {
    await page.goto(`${E2E_CONFIG.baseUrl}/invoices/export`);
    
    // Select format
    await page.selectOption('select[name="format"]', format);
    
    // Start download
    const downloadPromise = page.waitForDownload();
    await page.click('button[type="submit"]');
    
    const download = await downloadPromise;
    return download;
  }
};

// Mock function to get test magic link token
// In a real implementation, this would either:
// 1. Call a test API endpoint
// 2. Use a test email service
// 3. Generate a valid token using the same JWT secret
async function getTestMagicLinkToken(email: string): Promise<string> {
  // This would be implemented based on your test setup
  // For now, return a mock token
  return `test-magic-link-token-${Date.now()}`;
}

// Utility functions
export const utils = {
  async waitForApiCall(apiPath: string, timeout: number = 10000) {
    return page.waitForResponse(
      response => response.url().includes(apiPath) && response.status() === 200,
      { timeout }
    );
  },

  async getApiResponse(apiPath: string) {
    const response = await page.waitForResponse(
      response => response.url().includes(apiPath)
    );
    return response.json();
  },

  async takeScreenshot(name: string) {
    if (process.env.E2E_SCREENSHOTS === 'true') {
      await page.screenshot({ 
        path: `tests/e2e/screenshots/${name}-${Date.now()}.png`,
        fullPage: true 
      });
    }
  },

  async waitForLoadingToComplete() {
    // Wait for any loading spinners or indicators to disappear
    await page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 }).catch(() => {});
  }
};

export { page, browser };