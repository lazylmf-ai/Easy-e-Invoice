import { describe, it, expect } from 'vitest';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

describe('Web App Smoke Tests', () => {
  it('should load the homepage', async () => {
    const response = await fetch(WEB_URL);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    
    const html = await response.text();
    expect(html).toContain('Easy e-Invoice');
  });

  it('should serve static assets', async () => {
    // Check favicon
    const faviconResponse = await fetch(`${WEB_URL}/favicon.ico`);
    expect(faviconResponse.status).toBe(200);
  });

  it('should include security headers', async () => {
    const response = await fetch(WEB_URL);
    
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
  });

  it('should have proper meta tags for SEO', async () => {
    const response = await fetch(WEB_URL);
    const html = await response.text();
    
    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<title>');
    expect(html).toContain('<meta name="viewport"');
  });

  it('should load API health endpoint', async () => {
    const response = await fetch(`${WEB_URL}/api/health`);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  it('should redirect to login for protected routes', async () => {
    const protectedRoutes = [
      '/dashboard',
      '/invoices',
      '/templates',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      const response = await fetch(`${WEB_URL}${route}`, {
        redirect: 'manual'
      });
      
      // Should redirect to login or return 401/403
      expect([301, 302, 307, 308, 401, 403]).toContain(response.status);
    }
  });

  it('should handle 404 errors gracefully', async () => {
    const response = await fetch(`${WEB_URL}/non-existent-page`);
    expect(response.status).toBe(404);
    
    const html = await response.text();
    expect(html).toContain('404');
  });

  it('should load CSS and JavaScript assets', async () => {
    const response = await fetch(WEB_URL);
    const html = await response.text();
    
    // Check for CSS links
    const cssMatches = html.match(/<link[^>]*\.css/g);
    expect(cssMatches).toBeTruthy();
    
    // Check for JavaScript scripts
    const jsMatches = html.match(/<script[^>]*\.js/g);
    expect(jsMatches).toBeTruthy();
  });

  it('should have proper Content Security Policy', async () => {
    const response = await fetch(WEB_URL);
    const csp = response.headers.get('Content-Security-Policy');
    
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });
});