import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  // Mock console methods to reduce noise in tests
  if (process.env.CI) {
    global.console = {
      ...console,
      log: () => {},
      warn: () => {},
      info: () => {},
    };
  }
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Reset state before each test
});

afterEach(async () => {
  // Cleanup after each test
});