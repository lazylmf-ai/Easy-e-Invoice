import { describe, it, expect, beforeEach } from 'vitest';
import { makeAuthenticatedRequest, makeRequest, createTestInvoice, createTestLineItem } from './setup';

describe('Invoices API Integration Tests', () => {
  describe('GET /invoices', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/invoices');

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('should return paginated invoices list', async () => {
      const response = await makeAuthenticatedRequest('/invoices');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
        pagination: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle pagination parameters', async () => {
      const response = await makeAuthenticatedRequest('/invoices?page=2&limit=5');

      expect(response.status).toBe(200);
      expect(response.data.pagination).toMatchObject({
        page: 2,
        limit: 5,
      });
    });

    it('should handle search parameters', async () => {
      const response = await makeAuthenticatedRequest('/invoices?search=INV-2024');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
      });
    });

    it('should handle status filtering', async () => {
      const response = await makeAuthenticatedRequest('/invoices?status=draft');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
      });
    });

    it('should handle date range filtering', async () => {
      const response = await makeAuthenticatedRequest('/invoices?dateFrom=2024-01-01&dateTo=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
      });
    });

    it('should reject invalid pagination parameters', async () => {
      const response = await makeAuthenticatedRequest('/invoices?page=0&limit=101');

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('POST /invoices', () => {
    it('should require authentication', async () => {
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const response = await makeRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      expect(response.status).toBe(401);
    });

    it('should create new invoice with valid data', async () => {
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const response = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('created'),
        invoice: {
          id: expect.any(String),
          invoiceNumber: invoiceData.invoice.invoiceNumber,
          status: 'draft',
        },
        validation: {
          score: expect.any(Number),
          results: expect.any(Array),
        },
        timestamp: expect.any(String),
      });
    });

    it('should validate Malaysian compliance rules', async () => {
      const invalidInvoiceData = {
        invoice: {
          ...createTestInvoice(),
          currency: 'USD',
          exchangeRate: '1.000000', // Invalid: should be different from 1.0 for non-MYR
        },
        lineItems: [createTestLineItem()],
      };

      const response = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidInvoiceData),
      });

      expect(response.status).toBe(201); // Still created but with validation warnings
      expect(response.data.validation.results.length).toBeGreaterThan(0);
      expect(response.data.validation.score).toBeLessThan(100);
    });

    it('should reject invoice without line items', async () => {
      const invalidData = {
        invoice: createTestInvoice(),
        lineItems: [],
      };

      const response = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('line item'),
      });
    });

    it('should reject invalid invoice data', async () => {
      const invalidData = {
        invoice: {
          ...createTestInvoice(),
          grandTotal: 'invalid-amount',
        },
        lineItems: [createTestLineItem()],
      };

      const response = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should handle duplicate invoice numbers', async () => {
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      // Create first invoice
      await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      // Try to create duplicate
      const response = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      expect(response.status).toBe(409);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('already exists'),
      });
    });
  });

  describe('GET /invoices/:id', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/invoices/test-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest('/invoices/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('not found'),
      });
    });

    it('should return invoice details for valid ID', async () => {
      // First create an invoice
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const createResponse = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      expect(createResponse.status).toBe(201);
      const invoiceId = createResponse.data.invoice.id;

      // Then fetch it
      const response = await makeAuthenticatedRequest(`/invoices/${invoiceId}`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoice: {
          id: invoiceId,
          invoiceNumber: invoiceData.invoice.invoiceNumber,
        },
        lineItems: expect.any(Array),
        validation: {
          score: expect.any(Number),
          results: expect.any(Array),
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('PUT /invoices/:id', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/invoices/test-id', {
        method: 'PUT',
        body: JSON.stringify({ invoice: {} }),
      });

      expect(response.status).toBe(401);
    });

    it('should update existing invoice', async () => {
      // First create an invoice
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const createResponse = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const invoiceId = createResponse.data.invoice.id;

      // Update it
      const updateData = {
        invoice: {
          notes: 'Updated test invoice',
        },
      };

      const response = await makeAuthenticatedRequest(`/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('updated'),
        invoice: {
          id: invoiceId,
          notes: 'Updated test invoice',
        },
      });
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest('/invoices/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify({ invoice: {} }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /invoices/:id', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/invoices/test-id', {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('should delete existing invoice', async () => {
      // First create an invoice
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const createResponse = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const invoiceId = createResponse.data.invoice.id;

      // Delete it
      const response = await makeAuthenticatedRequest(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('deleted'),
      });

      // Verify it's gone
      const getResponse = await makeAuthenticatedRequest(`/invoices/${invoiceId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest('/invoices/non-existent-id', {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /invoices/:id/validate', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/invoices/test-id/validate', {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    it('should validate existing invoice', async () => {
      // First create an invoice
      const invoiceData = {
        invoice: createTestInvoice(),
        lineItems: [createTestLineItem()],
      };

      const createResponse = await makeAuthenticatedRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const invoiceId = createResponse.data.invoice.id;

      // Validate it
      const response = await makeAuthenticatedRequest(`/invoices/${invoiceId}/validate`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        validation: {
          score: expect.any(Number),
          results: expect.any(Array),
          isValid: expect.any(Boolean),
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest('/invoices/non-existent-id/validate', {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });
});