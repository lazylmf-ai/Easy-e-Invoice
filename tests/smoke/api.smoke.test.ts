import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8787';

describe('API Smoke Tests', () => {
  it('should respond to health check', async () => {
    const response = await fetch(`${API_URL}/health`);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  it('should return proper CORS headers', async () => {
    const response = await fetch(`${API_URL}/health`);
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
  });

  it('should include security headers', async () => {
    const response = await fetch(`${API_URL}/health`);
    
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('should require authentication for protected endpoints', async () => {
    const protectedEndpoints = [
      '/api/invoices',
      '/api/organizations',
      '/api/templates',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await fetch(`${API_URL}${endpoint}`);
      expect(response.status).toBe(401);
    }
  });

  it('should handle invalid routes gracefully', async () => {
    const response = await fetch(`${API_URL}/non-existent-route`);
    expect(response.status).toBe(404);
  });

  it('should validate content-type for POST requests', async () => {
    const response = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'invalid data',
    });

    expect(response.status).toBe(400);
  });

  it('should handle malformed JSON gracefully', async () => {
    const response = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
  });

  it('should enforce rate limits', async () => {
    // Make multiple rapid requests to trigger rate limiting
    const requests = Array.from({ length: 20 }, () => 
      fetch(`${API_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});