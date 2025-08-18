import { describe, it, expect } from 'vitest';
import { makeAuthenticatedRequest, makeRequest, createTestInvoice, createTestLineItem } from './setup';

describe('Import/Export API Integration Tests', () => {
  describe('POST /import/csv', () => {
    it('should require authentication', async () => {
      const csvData = 'Invoice Number,Issue Date,Amount\nINV-001,2024-01-15,1000.00';
      
      const response = await makeRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvData,
      });

      expect(response.status).toBe(401);
    });

    it('should process valid CSV data', async () => {
      const csvData = `Invoice Number,Issue Date,Due Date,Currency,Amount,SST Amount,Description,Quantity,Unit Price
INV-2024-001,2024-01-15,2024-02-15,MYR,1000.00,60.00,Professional Services,1,1000.00`;

      const response = await makeAuthenticatedRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvData,
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: expect.stringContaining('processed'),
        summary: {
          totalRows: expect.any(Number),
          successfulImports: expect.any(Number),
          failedImports: expect.any(Number),
        },
        results: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should handle invalid CSV format', async () => {
      const invalidCsvData = 'Invalid,CSV,Format\nMissing,Required,Headers';

      const response = await makeAuthenticatedRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: invalidCsvData,
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('CSV'),
      });
    });

    it('should validate imported invoice data', async () => {
      const csvWithInvalidData = `Invoice Number,Issue Date,Due Date,Currency,Amount,SST Amount,Description,Quantity,Unit Price
INV-INVALID,invalid-date,2024-02-15,USD,1000.00,60.00,Services,1,1000.00`;

      const response = await makeAuthenticatedRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvWithInvalidData,
      });

      expect(response.status).toBe(200);
      expect(response.data.summary.failedImports).toBeGreaterThan(0);
      expect(response.data.results[0]).toMatchObject({
        row: 1,
        success: false,
        errors: expect.any(Array),
      });
    });

    it('should handle large CSV files', async () => {
      // Generate a larger CSV with 100 rows
      let csvData = 'Invoice Number,Issue Date,Due Date,Currency,Amount,SST Amount,Description,Quantity,Unit Price\n';
      
      for (let i = 1; i <= 100; i++) {
        csvData += `INV-2024-${i.toString().padStart(3, '0')},2024-01-15,2024-02-15,MYR,1000.00,60.00,Service ${i},1,1000.00\n`;
      }

      const response = await makeAuthenticatedRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvData,
      });

      expect(response.status).toBe(200);
      expect(response.data.summary.totalRows).toBe(100);
    });

    it('should reject non-CSV content type', async () => {
      const response = await makeAuthenticatedRequest('/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'not csv' }),
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('CSV'),
      });
    });
  });

  describe('GET /export/invoices', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/export/invoices?format=csv');

      expect(response.status).toBe(401);
    });

    it('should export invoices as CSV', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=csv');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('invoices-export');
    });

    it('should export invoices as JSON', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=json');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
        metadata: {
          exportDate: expect.any(String),
          totalCount: expect.any(Number),
        },
      });
    });

    it('should export invoices as MyInvois JSON', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=myinvois');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.data).toMatchObject({
        documents: expect.any(Array),
        metadata: {
          version: expect.any(String),
          generatedAt: expect.any(String),
        },
      });
    });

    it('should handle date range filtering', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=json&dateFrom=2024-01-01&dateTo=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: expect.any(Array),
        metadata: {
          filters: {
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31',
          },
        },
      });
    });

    it('should handle status filtering', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=json&status=approved');

      expect(response.status).toBe(200);
      expect(response.data.metadata.filters).toMatchObject({
        status: 'approved',
      });
    });

    it('should reject invalid export format', async () => {
      const response = await makeAuthenticatedRequest('/export/invoices?format=invalid');

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('format'),
      });
    });

    it('should handle empty export result', async () => {
      // Request export for a date range with no invoices
      const response = await makeAuthenticatedRequest('/export/invoices?format=json&dateFrom=2030-01-01&dateTo=2030-12-31');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoices: [],
        metadata: {
          totalCount: 0,
        },
      });
    });
  });

  describe('POST /export/invoice/:id', () => {
    it('should require authentication', async () => {
      const response = await makeRequest('/export/invoice/test-id?format=pdf');

      expect(response.status).toBe(401);
    });

    it('should export single invoice as PDF', async () => {
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

      // Export it as PDF
      const response = await makeAuthenticatedRequest(`/export/invoice/${invoiceId}?format=pdf`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/pdf');
      expect(response.headers.get('content-disposition')).toContain('attachment');
    });

    it('should export single invoice as JSON', async () => {
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

      // Export it as JSON
      const response = await makeAuthenticatedRequest(`/export/invoice/${invoiceId}?format=json`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        invoice: {
          id: invoiceId,
        },
        lineItems: expect.any(Array),
        organization: expect.any(Object),
      });
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest('/export/invoice/non-existent-id?format=pdf');

      expect(response.status).toBe(404);
    });
  });

  describe('Templates API', () => {
    describe('GET /templates', () => {
      it('should require authentication', async () => {
        const response = await makeRequest('/templates');

        expect(response.status).toBe(401);
      });

      it('should return templates list', async () => {
        const response = await makeAuthenticatedRequest('/templates');

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          templates: expect.any(Array),
          timestamp: expect.any(String),
        });
      });
    });

    describe('POST /templates', () => {
      it('should require authentication', async () => {
        const templateData = {
          name: 'Test Template',
          invoice: createTestInvoice(),
          lineItems: [createTestLineItem()],
        };

        const response = await makeRequest('/templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
        });

        expect(response.status).toBe(401);
      });

      it('should create new template', async () => {
        const templateData = {
          name: 'Professional Services Template',
          description: 'Template for professional consulting services',
          invoice: createTestInvoice(),
          lineItems: [createTestLineItem()],
        };

        const response = await makeAuthenticatedRequest('/templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
        });

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          message: expect.stringContaining('created'),
          template: {
            id: expect.any(String),
            name: templateData.name,
            description: templateData.description,
          },
          timestamp: expect.any(String),
        });
      });

      it('should validate template data', async () => {
        const invalidTemplateData = {
          name: '', // Invalid: empty name
          invoice: createTestInvoice(),
          lineItems: [],
        };

        const response = await makeAuthenticatedRequest('/templates', {
          method: 'POST',
          body: JSON.stringify(invalidTemplateData),
        });

        expect(response.status).toBe(400);
        expect(response.data).toMatchObject({
          error: expect.any(String),
        });
      });
    });

    describe('GET /templates/:id', () => {
      it('should require authentication', async () => {
        const response = await makeRequest('/templates/test-id');

        expect(response.status).toBe(401);
      });

      it('should return template details', async () => {
        // First create a template
        const templateData = {
          name: 'Test Template',
          invoice: createTestInvoice(),
          lineItems: [createTestLineItem()],
        };

        const createResponse = await makeAuthenticatedRequest('/templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
        });

        const templateId = createResponse.data.template.id;

        // Get template details
        const response = await makeAuthenticatedRequest(`/templates/${templateId}`);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          template: {
            id: templateId,
            name: templateData.name,
          },
          timestamp: expect.any(String),
        });
      });

      it('should return 404 for non-existent template', async () => {
        const response = await makeAuthenticatedRequest('/templates/non-existent-id');

        expect(response.status).toBe(404);
      });
    });

    describe('POST /templates/:id/use', () => {
      it('should require authentication', async () => {
        const response = await makeRequest('/templates/test-id/use', {
          method: 'POST',
        });

        expect(response.status).toBe(401);
      });

      it('should create invoice from template', async () => {
        // First create a template
        const templateData = {
          name: 'Test Template',
          invoice: createTestInvoice(),
          lineItems: [createTestLineItem()],
        };

        const createResponse = await makeAuthenticatedRequest('/templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
        });

        const templateId = createResponse.data.template.id;

        // Use template to create invoice
        const useTemplateData = {
          invoiceNumber: 'INV-FROM-TEMPLATE-001',
          issueDate: '2024-02-01',
        };

        const response = await makeAuthenticatedRequest(`/templates/${templateId}/use`, {
          method: 'POST',
          body: JSON.stringify(useTemplateData),
        });

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          message: expect.stringContaining('created'),
          invoice: {
            id: expect.any(String),
            invoiceNumber: useTemplateData.invoiceNumber,
            issueDate: useTemplateData.issueDate,
          },
        });
      });

      it('should return 404 for non-existent template', async () => {
        const response = await makeAuthenticatedRequest('/templates/non-existent-id/use', {
          method: 'POST',
          body: JSON.stringify({ invoiceNumber: 'INV-001' }),
        });

        expect(response.status).toBe(404);
      });
    });
  });
});