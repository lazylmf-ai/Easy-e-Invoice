import { describe, it, expect } from 'vitest';
import { makeAuthenticatedRequest, makeRequest, createTestOrganization } from './setup';

describe('Organizations API Integration Tests', () => {
  describe('GET /org/profile', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/org/profile');

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('should return organization profile when exists', async () => {
      const response = await makeAuthenticatedRequest('/org/profile');

      // Assuming test user has an organization set up
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          organization: {
            id: expect.any(String),
            name: expect.any(String),
            tin: expect.any(String),
            address: expect.any(Object),
          },
          timestamp: expect.any(String),
        });
      } else {
        // If no organization exists, should return 404
        expect(response.status).toBe(404);
        expect(response.data).toMatchObject({
          error: 'Not Found',
          message: expect.stringContaining('organization'),
        });
      }
    });
  });

  describe('POST /org/profile', () => {
    it('should require authentication', async () => {
      const orgData = createTestOrganization();

      const response = await makeRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      expect(response.status).toBe(401);
    });

    it('should create organization profile with valid data', async () => {
      const orgData = createTestOrganization();

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('created'),
        organization: {
          id: expect.any(String),
          name: orgData.name,
          tin: orgData.tin,
          industryCode: orgData.industryCode,
          isSstRegistered: orgData.isSstRegistered,
        },
        timestamp: expect.any(String),
      });
    });

    it('should validate Malaysian TIN format', async () => {
      const invalidOrgData = {
        ...createTestOrganization(),
        tin: 'INVALID123',
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(invalidOrgData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('TIN'),
      });
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Test Company',
        // Missing required fields like TIN, address
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should validate Malaysian address format', async () => {
      const invalidAddressData = {
        ...createTestOrganization(),
        address: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'Invalid State', // Not a valid Malaysian state
          postcode: '12345',
          country: 'MY',
        },
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(invalidAddressData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('state'),
      });
    });

    it('should validate industry code format', async () => {
      const invalidIndustryData = {
        ...createTestOrganization(),
        industryCode: 'INVALID',
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(invalidIndustryData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('industry'),
      });
    });

    it('should handle duplicate organization creation', async () => {
      const orgData = createTestOrganization();

      // Create first organization
      await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      // Try to create another for the same user
      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      expect(response.status).toBe(409);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('already exists'),
      });
    });
  });

  describe('PUT /org/profile', () => {
    it('should require authentication', async () => {
      const updateData = {
        name: 'Updated Company Name',
      };

      const response = await makeRequest('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(401);
    });

    it('should update organization profile', async () => {
      // First create an organization
      const orgData = createTestOrganization();
      await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      // Then update it
      const updateData = {
        name: 'Updated Company Name Sdn Bhd',
        isSstRegistered: false,
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('updated'),
        organization: {
          name: updateData.name,
          isSstRegistered: updateData.isSstRegistered,
        },
      });
    });

    it('should return 404 when no organization exists', async () => {
      const updateData = {
        name: 'Updated Company',
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('organization'),
      });
    });

    it('should validate update data', async () => {
      // First create an organization
      const orgData = createTestOrganization();
      await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      // Try to update with invalid data
      const invalidUpdateData = {
        tin: 'INVALID123',
      };

      const response = await makeAuthenticatedRequest('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('GET /org/validation', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/org/validation');

      expect(response.status).toBe(401);
    });

    it('should validate organization setup', async () => {
      // First create an organization
      const orgData = createTestOrganization();
      await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });

      const response = await makeAuthenticatedRequest('/org/validation');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        validation: {
          isValid: expect.any(Boolean),
          score: expect.any(Number),
          results: expect.any(Array),
        },
        checklist: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should return validation for organization with issues', async () => {
      // Create organization with potential validation issues
      const problematicOrgData = {
        ...createTestOrganization(),
        industryCode: '35101', // Electric power (prohibited from B2C consolidation)
        isSstRegistered: false, // Not SST registered
      };

      await makeAuthenticatedRequest('/org/profile', {
        method: 'POST',
        body: JSON.stringify(problematicOrgData),
      });

      const response = await makeAuthenticatedRequest('/org/validation');

      expect(response.status).toBe(200);
      expect(response.data.validation.results.length).toBeGreaterThan(0);
      expect(response.data.validation.score).toBeLessThan(100);
    });

    it('should return 404 when no organization exists', async () => {
      const response = await makeAuthenticatedRequest('/org/validation');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('organization'),
      });
    });
  });

  describe('POST /org/tin/validate', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/org/tin/validate', {
        method: 'POST',
        body: JSON.stringify({ tin: 'C1234567890' }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate valid Malaysian TIN', async () => {
      const validTins = [
        'C1234567890', // Corporate
        '123456789012', // Individual
        'G1234567890', // Government
        'N1234567890', // Non-profit
      ];

      for (const tin of validTins) {
        const response = await makeAuthenticatedRequest('/org/tin/validate', {
          method: 'POST',
          body: JSON.stringify({ tin }),
        });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          tin,
          isValid: true,
          type: expect.any(String),
          format: expect.any(String),
          timestamp: expect.any(String),
        });
      }
    });

    it('should reject invalid TIN formats', async () => {
      const invalidTins = [
        'INVALID123',
        '12345', // Too short
        'C123456789012345', // Too long
        'X1234567890', // Invalid prefix
        '',
      ];

      for (const tin of invalidTins) {
        const response = await makeAuthenticatedRequest('/org/tin/validate', {
          method: 'POST',
          body: JSON.stringify({ tin }),
        });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          tin,
          isValid: false,
          errors: expect.any(Array),
        });
        expect(response.data.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing TIN', async () => {
      const response = await makeAuthenticatedRequest('/org/tin/validate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('TIN'),
      });
    });
  });
});