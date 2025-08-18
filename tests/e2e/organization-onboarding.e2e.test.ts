import { describe, it, expect } from 'vitest';
import { page, authHelpers, utils, E2E_CONFIG } from './setup';

describe('Organization Onboarding E2E Tests', () => {
  beforeEach(async () => {
    await authHelpers.login();
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full organization setup for new user', async () => {
      // Should automatically redirect to onboarding
      await page.waitForURL('**/org/setup', { timeout: 15000 });
      
      // Verify onboarding wizard
      await expect(page.locator('h1')).toContainText('Organization Setup');
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/active/);
      
      // Step 1: Basic Organization Information
      await page.fill('input[name="name"]', 'Tech Solutions Sdn Bhd');
      await page.fill('input[name="tin"]', 'C1234567890');
      await page.fill('input[name="brn"]', 'BRN-123456789');
      
      // TIN validation should happen automatically
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="tin-validation-status"]')).toContainText('Valid');
      
      // Continue to next step
      await page.click('[data-testid="next-step"]');
      
      // Step 2: Industry and Tax Information
      await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/active/);
      
      await page.selectOption('select[name="industryCode"]', '62010'); // Computer programming
      await page.check('input[name="isSstRegistered"]');
      await page.fill('input[name="sstNumber"]', 'SST-123456789');
      
      // Show industry compliance information
      await expect(page.locator('[data-testid="industry-info"]')).toBeVisible();
      await expect(page.locator('text=Computer programming')).toBeVisible();
      await expect(page.locator('text=B2C consolidation allowed')).toBeVisible();
      
      await page.click('[data-testid="next-step"]');
      
      // Step 3: Address Information
      await expect(page.locator('[data-testid="step-3"]')).toHaveClass(/active/);
      
      await page.fill('input[name="address.line1"]', 'Level 10, Menara Tech');
      await page.fill('input[name="address.line2"]', 'Jalan Technology Park');
      await page.fill('input[name="address.city"]', 'Cyberjaya');
      await page.selectOption('select[name="address.state"]', 'Selangor');
      await page.fill('input[name="address.postcode"]', '63000');
      
      // Address validation
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="address-validation"]')).toContainText('Valid Malaysian address');
      
      await page.click('[data-testid="next-step"]');
      
      // Step 4: Contact Information
      await expect(page.locator('[data-testid="step-4"]')).toHaveClass(/active/);
      
      await page.fill('input[name="phone"]', '+60123456789');
      await page.fill('input[name="email"]', 'admin@techsolutions.com.my');
      await page.fill('input[name="website"]', 'https://techsolutions.com.my');
      
      await page.click('[data-testid="next-step"]');
      
      // Step 5: Review and Confirmation
      await expect(page.locator('[data-testid="step-5"]')).toHaveClass(/active/);
      
      // Verify all information is displayed for review
      await expect(page.locator('[data-testid="review-name"]')).toContainText('Tech Solutions Sdn Bhd');
      await expect(page.locator('[data-testid="review-tin"]')).toContainText('C1234567890');
      await expect(page.locator('[data-testid="review-industry"]')).toContainText('Computer programming');
      await expect(page.locator('[data-testid="review-address"]')).toContainText('Cyberjaya');
      
      // Compliance check summary
      await expect(page.locator('[data-testid="compliance-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="compliance-score"]')).toContainText('100%');
      
      // Terms and conditions
      await page.check('input[name="acceptTerms"]');
      await page.check('input[name="acceptPrivacyPolicy"]');
      
      // Complete setup
      await page.click('[data-testid="complete-setup"]');
      
      // Wait for completion
      await expect(page.locator('[data-testid="setup-success"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Organization setup completed successfully')).toBeVisible();
      
      // Should redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Verify dashboard shows organization info
      await expect(page.locator('[data-testid="org-name"]')).toContainText('Tech Solutions Sdn Bhd');
      await expect(page.locator('[data-testid="org-tin"]')).toContainText('C1234567890');
      
      await utils.takeScreenshot('onboarding-complete');
    });

    it('should handle step-by-step validation and error correction', async () => {
      await page.waitForURL('**/org/setup');
      
      // Step 1: Try invalid TIN format
      await page.fill('input[name="name"]', 'Invalid TIN Company');
      await page.fill('input[name="tin"]', 'INVALID123');
      
      await page.click('[data-testid="next-step"]');
      
      // Should show TIN validation error
      await expect(page.locator('[data-testid="tin-error"]')).toBeVisible();
      await expect(page.locator('text=Invalid TIN format')).toBeVisible();
      
      // Cannot proceed to next step
      await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/active/);
      
      // Fix TIN
      await page.fill('input[name="tin"]', 'C1234567890');
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="tin-validation-status"]')).toContainText('Valid');
      
      // Now can proceed
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/active/);
      
      // Step 2: Select prohibited industry for consolidation
      await page.selectOption('select[name="industryCode"]', '35101'); // Electric power
      
      // Should show consolidation warning
      await expect(page.locator('[data-testid="consolidation-warning"]')).toBeVisible();
      await expect(page.locator('text=B2C consolidation not allowed')).toBeVisible();
      await expect(page.locator('text=Individual invoices required')).toBeVisible();
      
      await page.click('[data-testid="next-step"]');
      
      // Step 3: Invalid postcode
      await page.fill('input[name="address.line1"]', 'Power Plant Address');
      await page.fill('input[name="address.city"]', 'Kuala Lumpur');
      await page.selectOption('select[name="address.state"]', 'Kuala Lumpur');
      await page.fill('input[name="address.postcode"]', '123'); // Invalid postcode
      
      await page.click('[data-testid="next-step"]');
      
      // Should show postcode validation error
      await expect(page.locator('[data-testid="postcode-error"]')).toBeVisible();
      await expect(page.locator('text=Malaysian postcode must be 5 digits')).toBeVisible();
      
      // Fix postcode
      await page.fill('input[name="address.postcode"]', '50000');
      
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="step-4"]')).toHaveClass(/active/);
    });

    it('should allow editing previous steps during onboarding', async () => {
      await page.waitForURL('**/org/setup');
      
      // Complete first few steps
      await page.fill('input[name="name"]', 'Editable Company Sdn Bhd');
      await page.fill('input[name="tin"]', 'C1111111111');
      await page.click('[data-testid="next-step"]');
      
      await page.selectOption('select[name="industryCode"]', '62010');
      await page.click('[data-testid="next-step"]');
      
      await page.fill('input[name="address.line1"]', 'Original Address');
      await page.fill('input[name="address.city"]', 'Kuala Lumpur');
      await page.selectOption('select[name="address.state"]', 'Kuala Lumpur');
      await page.fill('input[name="address.postcode"]', '50000');
      await page.click('[data-testid="next-step"]');
      
      // From step 4, go back to edit step 1
      await page.click('[data-testid="edit-step-1"]');
      
      // Should go back to step 1 with preserved data
      await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/active/);
      await expect(page.locator('input[name="name"]')).toHaveValue('Editable Company Sdn Bhd');
      
      // Edit company name
      await page.fill('input[name="name"]', 'Updated Company Name Sdn Bhd');
      
      // Navigate back to where we were
      await page.click('[data-testid="next-step"]');
      await page.click('[data-testid="next-step"]');
      await page.click('[data-testid="next-step"]');
      
      // Should be back at step 4 with updated data
      await expect(page.locator('[data-testid="step-4"]')).toHaveClass(/active/);
      
      // Go to review step to verify changes
      await page.fill('input[name="phone"]', '+60123456789');
      await page.click('[data-testid="next-step"]');
      
      // Verify updated name in review
      await expect(page.locator('[data-testid="review-name"]')).toContainText('Updated Company Name Sdn Bhd');
    });
  });

  describe('Industry-Specific Onboarding', () => {
    it('should show specific guidance for SST-registered businesses', async () => {
      await page.waitForURL('**/org/setup');
      
      // Basic info
      await page.fill('input[name="name"]', 'SST Registered Company Sdn Bhd');
      await page.fill('input[name="tin"]', 'C2222222222');
      await page.click('[data-testid="next-step"]');
      
      // Select SST registration
      await page.selectOption('select[name="industryCode"]', '47'); // Retail
      await page.check('input[name="isSstRegistered"]');
      
      // Should show SST-specific information
      await expect(page.locator('[data-testid="sst-info-panel"]')).toBeVisible();
      await expect(page.locator('text=SST rate: 6%')).toBeVisible();
      await expect(page.locator('text=SST number required')).toBeVisible();
      
      // SST number becomes required
      await page.fill('input[name="sstNumber"]', 'SST-987654321');
      
      // Show retail-specific consolidation limits
      await expect(page.locator('[data-testid="retail-consolidation-info"]')).toBeVisible();
      await expect(page.locator('text=Maximum 200 transactions per consolidated invoice')).toBeVisible();
    });

    it('should handle non-SST registered businesses', async () => {
      await page.waitForURL('**/org/setup');
      
      await page.fill('input[name="name"]', 'Non-SST Company Sdn Bhd');
      await page.fill('input[name="tin"]', 'C3333333333');
      await page.click('[data-testid="next-step"]');
      
      // Don't register for SST
      await page.selectOption('select[name="industryCode"]', '62010');
      // Leave isSstRegistered unchecked
      
      // Should show non-SST information
      await expect(page.locator('[data-testid="non-sst-info"]')).toBeVisible();
      await expect(page.locator('text=No SST charges on invoices')).toBeVisible();
      await expect(page.locator('text=Consider SST registration if revenue > RM500,000')).toBeVisible();
      
      // SST number field should be hidden/disabled
      await expect(page.locator('input[name="sstNumber"]')).not.toBeVisible();
    });

    it('should show warnings for restricted industries', async () => {
      await page.waitForURL('**/org/setup');
      
      await page.fill('input[name="name"]', 'Electric Company Sdn Bhd');
      await page.fill('input[name="tin"]', 'C4444444444');
      await page.click('[data-testid="next-step"]');
      
      // Select electric power industry
      await page.selectOption('select[name="industryCode"]', '35101');
      
      // Should show restrictions prominently
      await expect(page.locator('[data-testid="industry-restrictions"]')).toBeVisible();
      await expect(page.locator('text=B2C consolidation not permitted')).toBeVisible();
      await expect(page.locator('text=Individual invoices required for each transaction')).toBeVisible();
      
      // Show compliance implications
      await expect(page.locator('[data-testid="compliance-implications"]')).toBeVisible();
      await expect(page.locator('text=Higher administrative overhead')).toBeVisible();
      await expect(page.locator('text=Real-time invoice submission required')).toBeVisible();
    });
  });

  describe('Address and Contact Validation', () => {
    it('should validate Malaysian address components', async () => {
      await page.waitForURL('**/org/setup');
      
      // Complete first two steps quickly
      await page.fill('input[name="name"]', 'Address Test Company');
      await page.fill('input[name="tin"]', 'C5555555555');
      await page.click('[data-testid="next-step"]');
      
      await page.selectOption('select[name="industryCode"]', '62010');
      await page.click('[data-testid="next-step"]');
      
      // Test various address validations
      await page.fill('input[name="address.line1"]', '123 Jalan Test');
      await page.fill('input[name="address.city"]', 'Petaling Jaya');
      
      // Test invalid state selection
      await page.selectOption('select[name="address.state"]', 'Selangor');
      await page.fill('input[name="address.postcode"]', '47000');
      
      // Should validate postcode against state
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="address-validation"]')).toContainText('Valid');
      
      // Test invalid postcode for state
      await page.fill('input[name="address.postcode"]', '10000'); // Kedah postcode in Selangor
      await expect(page.locator('[data-testid="postcode-warning"]')).toBeVisible();
      await expect(page.locator('text=Postcode may not match selected state')).toBeVisible();
      
      // Fix postcode
      await page.fill('input[name="address.postcode"]', '47000');
      await expect(page.locator('[data-testid="address-validation"]')).toContainText('Valid');
    });

    it('should validate contact information formats', async () => {
      await page.waitForURL('**/org/setup');
      
      // Navigate to contact step
      await page.fill('input[name="name"]', 'Contact Test Company');
      await page.fill('input[name="tin"]', 'C6666666666');
      await page.click('[data-testid="next-step"]');
      
      await page.selectOption('select[name="industryCode"]', '62010');
      await page.click('[data-testid="next-step"]');
      
      await page.fill('input[name="address.line1"]', 'Test Address');
      await page.fill('input[name="address.city"]', 'Kuala Lumpur');
      await page.selectOption('select[name="address.state"]', 'Kuala Lumpur');
      await page.fill('input[name="address.postcode"]', '50000');
      await page.click('[data-testid="next-step"]');
      
      // Test phone number validation
      await page.fill('input[name="phone"]', '123456'); // Invalid format
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
      
      await page.fill('input[name="phone"]', '+60123456789'); // Valid format
      await expect(page.locator('[data-testid="phone-validation"]')).toContainText('Valid');
      
      // Test email validation
      await page.fill('input[name="email"]', 'invalid-email'); // Invalid format
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      
      await page.fill('input[name="email"]', 'contact@company.com.my'); // Valid format
      await expect(page.locator('[data-testid="email-validation"]')).toContainText('Valid');
      
      // Test website validation
      await page.fill('input[name="website"]', 'not-a-url'); // Invalid format
      await expect(page.locator('[data-testid="website-error"]')).toBeVisible();
      
      await page.fill('input[name="website"]', 'https://company.com.my'); // Valid format
      await expect(page.locator('[data-testid="website-validation"]')).toContainText('Valid');
    });
  });

  describe('Onboarding Error Handling', () => {
    it('should handle network errors during TIN validation', async () => {
      await page.waitForURL('**/org/setup');
      
      await page.fill('input[name="name"]', 'Network Test Company');
      await page.fill('input[name="tin"]', 'C7777777777');
      
      // Simulate network error
      await page.context().setOffline(true);
      
      // TIN validation should show network error
      await expect(page.locator('[data-testid="tin-network-error"]')).toBeVisible();
      await expect(page.locator('text=Unable to validate TIN')).toBeVisible();
      
      // Should allow manual override or retry
      await expect(page.locator('[data-testid="retry-tin-validation"]')).toBeVisible();
      
      // Restore network and retry
      await page.context().setOffline(false);
      await page.click('[data-testid="retry-tin-validation"]');
      
      await utils.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="tin-validation-status"]')).toContainText('Valid');
    });

    it('should save progress and allow resuming onboarding', async () => {
      await page.waitForURL('**/org/setup');
      
      // Fill first step
      await page.fill('input[name="name"]', 'Resume Test Company');
      await page.fill('input[name="tin"]', 'C8888888888');
      await page.click('[data-testid="next-step"]');
      
      // Fill second step
      await page.selectOption('select[name="industryCode"]', '62010');
      await page.check('input[name="isSstRegistered"]');
      
      // Navigate away (simulate user leaving)
      await page.goto(`${E2E_CONFIG.baseUrl}/dashboard`);
      
      // Should redirect back to onboarding
      await page.waitForURL('**/org/setup');
      
      // Should resume from where left off
      await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/active/);
      
      // Data should be preserved
      await expect(page.locator('select[name="industryCode"]')).toHaveValue('62010');
      await expect(page.locator('input[name="isSstRegistered"]')).toBeChecked();
      
      // Can go back and see previous step data
      await page.click('[data-testid="previous-step"]');
      await expect(page.locator('input[name="name"]')).toHaveValue('Resume Test Company');
      await expect(page.locator('input[name="tin"]')).toHaveValue('C8888888888');
    });

    it('should handle organization already exists error', async () => {
      await page.waitForURL('**/org/setup');
      
      // Try to create organization with existing TIN
      await page.fill('input[name="name"]', 'Duplicate TIN Company');
      await page.fill('input[name="tin"]', 'C1234567890'); // Assume this exists
      
      await page.click('[data-testid="next-step"]');
      await page.selectOption('select[name="industryCode"]', '62010');
      await page.click('[data-testid="next-step"]');
      
      // Fill remaining steps
      await page.fill('input[name="address.line1"]', 'Duplicate Address');
      await page.fill('input[name="address.city"]', 'Kuala Lumpur');
      await page.selectOption('select[name="address.state"]', 'Kuala Lumpur');
      await page.fill('input[name="address.postcode"]', '50000');
      await page.click('[data-testid="next-step"]');
      
      await page.fill('input[name="phone"]', '+60123456789');
      await page.click('[data-testid="next-step"]');
      
      // Try to complete setup
      await page.check('input[name="acceptTerms"]');
      await page.check('input[name="acceptPrivacyPolicy"]');
      await page.click('[data-testid="complete-setup"]');
      
      // Should show duplicate organization error
      await expect(page.locator('[data-testid="duplicate-org-error"]')).toBeVisible();
      await expect(page.locator('text=Organization with this TIN already exists')).toBeVisible();
      
      // Should offer options to contact support or use different TIN
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
      await expect(page.locator('[data-testid="change-tin"]')).toBeVisible();
    });
  });
});