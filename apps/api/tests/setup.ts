import { beforeAll, afterAll, beforeEach } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

declare global {
  var worker: UnstableDevWorker;
}

beforeAll(async () => {
  // Start Cloudflare Workers dev server for integration tests
  global.worker = await unstable_dev('./src/index.ts', {
    experimental: { disableExperimentalWarning: true },
    vars: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_einvoice',
      JWT_SECRET: 'test-jwt-secret-for-integration-tests',
      RESEND_API_KEY: 'test-resend-key',
      FRONTEND_URL: 'http://localhost:3000'
    }
  });
});

afterAll(async () => {
  if (global.worker) {
    await global.worker.stop();
  }
});

export const getTestBaseUrl = () => {
  return `http://127.0.0.1:${global.worker.port}`;
};

// Helper to make authenticated requests
export const createTestAuthToken = async () => {
  // This would normally use the auth service to create a valid test token
  // For now, we'll use a mock token that matches our test setup
  return 'test-auth-token';
};

// Test data factories
export const createTestUser = () => ({
  id: 'test-user-1',
  email: 'test@example.com',
  orgId: 'test-org-1',
  isEmailVerified: true,
});

export const createTestOrganization = () => ({
  id: 'test-org-1',
  name: 'Test Company Sdn Bhd',
  tin: 'C1234567890',
  industryCode: '62010',
  isSstRegistered: true,
  address: {
    line1: '123 Business Street',
    city: 'Kuala Lumpur',
    state: 'Kuala Lumpur',
    postcode: '50000',
    country: 'MY'
  }
});

export const createTestInvoice = () => ({
  invoiceNumber: 'INV-2024-001',
  eInvoiceType: '01' as const,
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  currency: 'MYR' as const,
  exchangeRate: '1.000000',
  isConsolidated: false,
  subtotal: '1000.00',
  totalDiscount: '0.00',
  sstAmount: '60.00',
  grandTotal: '1060.00',
  status: 'draft' as const,
  buyerName: 'Test Buyer Sdn Bhd',
  buyerTin: 'C9876543210',
  buyerEmail: 'buyer@example.com',
  notes: 'Test invoice'
});

export const createTestLineItem = () => ({
  itemDescription: 'Professional Consulting Services',
  quantity: '1.000',
  unitPrice: '1000.00',
  discountAmount: '0.00',
  lineTotal: '1000.00',
  sstRate: '6.00',
  sstAmount: '60.00'
});

// HTTP helpers
export const makeRequest = async (path: string, options: RequestInit = {}) => {
  const baseUrl = getTestBaseUrl();
  const url = `${baseUrl}${path}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const responseText = await response.text();
  let data;
  
  try {
    data = JSON.parse(responseText);
  } catch {
    data = responseText;
  }
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data,
    ok: response.ok,
  };
};

export const makeAuthenticatedRequest = async (path: string, options: RequestInit = {}) => {
  const token = await createTestAuthToken();
  
  return makeRequest(path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
};