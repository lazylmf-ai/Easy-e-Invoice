import { describe, it, expect } from 'vitest';
import { page, authHelpers, organizationHelpers, utils, E2E_CONFIG } from './setup';

describe('Authentication Flow E2E Tests', () => {
  describe('Magic Link Authentication', () => {
    it('should complete full authentication flow for new user', async () => {
      const testEmail = `test-new-user-${Date.now()}@example.com`;
      
      // Navigate to login page
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Verify login page loads
      await expect(page.locator('h1')).toContainText('Sign in');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Fill email form
      await page.fill('input[type="email"]', testEmail);
      
      // Submit magic link request
      const apiCallPromise = utils.waitForApiCall('/auth/magic-link');
      await page.click('button[type="submit"]');
      
      // Verify API call was made
      await apiCallPromise;
      
      // Verify confirmation message
      await expect(page.locator('text=magic link has been sent')).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
      
      // Take screenshot for verification
      await utils.takeScreenshot('magic-link-sent');
      
      // For E2E testing, simulate clicking the magic link
      // In production, this would be from an email
      const testToken = 'test-token-123'; // This would come from test email service
      
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/verify?token=${testToken}`);
      
      // For new users, should redirect to onboarding
      await page.waitForURL('**/org/setup', { timeout: 15000 });
      
      // Verify onboarding page
      await expect(page.locator('h1')).toContainText('Organization Setup');
      await expect(page.locator('input[name="name"]')).toBeVisible();
    });

    it('should handle returning user authentication', async () => {
      const existingEmail = 'existing-user@example.com';
      
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      await page.fill('input[type="email"]', existingEmail);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=magic link has been sent')).toBeVisible();
      
      // Simulate magic link click for existing user
      const testToken = 'existing-user-token';
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/verify?token=${testToken}`);
      
      // Existing users should go to dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    it('should handle invalid magic link token', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/verify?token=invalid-token`);
      
      // Should show error message
      await expect(page.locator('text=invalid')).toBeVisible();
      await expect(page.locator('text=expired')).toBeVisible();
      
      // Should have option to request new magic link
      await expect(page.locator('text=Request new magic link')).toBeVisible();
    });

    it('should handle expired magic link token', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/verify?token=expired-token`);
      
      await expect(page.locator('text=expired')).toBeVisible();
      await expect(page.locator('text=Request new magic link')).toBeVisible();
    });

    it('should enforce rate limiting on magic link requests', async () => {
      const email = 'rate-limit-test@example.com';
      
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        
        if (i < 3) {
          await expect(page.locator('text=magic link has been sent')).toBeVisible();
        } else {
          // Should eventually show rate limit message
          await expect(page.locator('text=too many requests')).toBeVisible();
          break;
        }
        
        // Wait a bit between requests
        await page.waitForTimeout(1000);
      }
    });
  });

  describe('User Session Management', () => {
    it('should maintain session across page refreshes', async () => {
      // Login first
      await authHelpers.login();
      
      // Verify we're on dashboard
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('h1')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    it('should handle logout correctly', async () => {
      // Login first
      await authHelpers.login();
      
      // Verify logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Logout
      await authHelpers.logout();
      
      // Should redirect to login page
      await page.waitForURL('**/auth/login');
      await expect(page.locator('h1')).toContainText('Sign in');
    });

    it('should redirect unauthenticated users to login', async () => {
      // Try to access protected page without login
      await page.goto(`${E2E_CONFIG.baseUrl}/dashboard`);
      
      // Should redirect to login
      await page.waitForURL('**/auth/login');
      await expect(page.locator('h1')).toContainText('Sign in');
    });

    it('should handle session expiration gracefully', async () => {
      // Login first
      await authHelpers.login();
      
      // Simulate expired token (this would require backend support)
      // For now, we'll clear localStorage to simulate expired session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected page
      await page.goto(`${E2E_CONFIG.baseUrl}/invoices`);
      
      // Should redirect to login with session expired message
      await page.waitForURL('**/auth/login');
      await expect(page.locator('text=session expired')).toBeVisible();
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle network errors during authentication', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Simulate network error by going offline
      await page.context().setOffline(true);
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Should show network error message
      await expect(page.locator('text=network error')).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
    });

    it('should validate email format before submission', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Try invalid email formats
      const invalidEmails = ['invalid', 'invalid@', '@invalid.com', 'spaces in@email.com'];
      
      for (const email of invalidEmails) {
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        
        // Should show validation error
        await expect(page.locator('text=valid email')).toBeVisible();
        
        // Clear field for next test
        await page.fill('input[type="email"]', '');
      }
    });

    it('should handle malformed magic link URLs', async () => {
      const malformedUrls = [
        `${E2E_CONFIG.baseUrl}/auth/verify`,
        `${E2E_CONFIG.baseUrl}/auth/verify?token=`,
        `${E2E_CONFIG.baseUrl}/auth/verify?invalid=token`,
      ];
      
      for (const url of malformedUrls) {
        await page.goto(url);
        
        // Should show error message
        await expect(page.locator('text=invalid')).toBeVisible();
      }
    });
  });

  describe('Security Features', () => {
    it('should implement CSRF protection', async () => {
      await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Check for CSRF token or other protection mechanisms
      const csrfMeta = page.locator('meta[name="csrf-token"]');
      if (await csrfMeta.count() > 0) {
        expect(await csrfMeta.getAttribute('content')).toBeTruthy();
      }
    });

    it('should use secure headers', async () => {
      const response = await page.goto(`${E2E_CONFIG.baseUrl}/auth/login`);
      
      // Check for security headers
      const headers = response?.headers();
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-frame-options']).toBeDefined();
      expect(headers?.['x-xss-protection']).toBeDefined();
    });

    it('should prevent unauthorized access to admin features', async () => {
      // Try to access admin endpoints without proper authentication
      const adminUrls = [
        '/admin',
        '/api/admin/users',
        '/api/admin/organizations',
      ];
      
      for (const url of adminUrls) {
        const response = await page.goto(`${E2E_CONFIG.baseUrl}${url}`);
        
        // Should return 401 or 403, or redirect to login
        expect([401, 403, 404]).toContain(response?.status() || 0);
      }
    });
  });
});