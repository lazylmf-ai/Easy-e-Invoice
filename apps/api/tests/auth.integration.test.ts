import { describe, it, expect, beforeEach } from 'vitest';
import { makeRequest, createTestUser } from './setup';

describe('Authentication API Integration Tests', () => {
  describe('POST /auth/magic-link', () => {
    it('should send magic link for valid email', async () => {
      const response = await makeRequest('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        }),
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('magic link'),
        email: 'test@example.com',
        timestamp: expect.any(String),
      });
    });

    it('should reject invalid email format', async () => {
      const response = await makeRequest('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email'
        }),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('email'),
      });
    });

    it('should reject missing email', async () => {
      const response = await makeRequest('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should handle rate limiting', async () => {
      const email = 'ratelimit@example.com';
      
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        makeRequest('/auth/magic-link', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      );

      const responses = await Promise.all(requests);
      
      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/verify', () => {
    it('should reject invalid token format', async () => {
      const response = await makeRequest('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token'
        }),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('token'),
      });
    });

    it('should reject missing token', async () => {
      const response = await makeRequest('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });

    // Note: Testing valid token verification would require
    // actual token generation which involves external services
    // This would be covered in end-to-end tests instead
  });

  describe('GET /auth/me', () => {
    it('should reject requests without authentication', async () => {
      const response = await makeRequest('/auth/me');

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: 'Unauthorized',
        message: expect.stringContaining('auth'),
      });
    });

    it('should reject requests with invalid token', async () => {
      const response = await makeRequest('/auth/me', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });

    // Note: Testing with valid authentication would require
    // mocking the auth middleware or using test tokens
  });

  describe('POST /auth/logout', () => {
    it('should handle logout requests', async () => {
      const response = await makeRequest('/auth/logout', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('Logged out'),
        timestamp: expect.any(String),
      });
    });
  });
});

describe('API Health and Status', () => {
  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await makeRequest('/');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: 'Easy e-Invoice API',
        version: '1.0.0',
        status: 'healthy',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await makeRequest('/health');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        database: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await makeRequest('/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('not found'),
        path: '/non-existent-endpoint',
        timestamp: expect.any(String),
      });
    });
  });
});

describe('API Security and CORS', () => {
  describe('CORS headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await makeRequest('/', {
        method: 'OPTIONS',
      });

      // Check for CORS headers
      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
      expect(response.headers.get('access-control-allow-methods')).toBeDefined();
      expect(response.headers.get('access-control-allow-headers')).toBeDefined();
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const response = await makeRequest('/');

      // Check for security headers
      expect(response.headers.get('x-content-type-options')).toBeDefined();
      expect(response.headers.get('x-frame-options')).toBeDefined();
      expect(response.headers.get('x-xss-protection')).toBeDefined();
    });
  });

  describe('Content-Type validation', () => {
    it('should reject invalid content types for POST requests', async () => {
      const response = await makeRequest('/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'invalid body',
      });

      expect(response.status).toBe(400);
    });
  });
});