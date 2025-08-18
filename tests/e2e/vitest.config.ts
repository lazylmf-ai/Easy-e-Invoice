import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.e2e.test.ts'],
    coverage: {
      enabled: false, // E2E tests don't need code coverage
    },
    // Longer timeout for E2E tests
    testTimeout: 60000,
    setupFiles: ['./setup.ts'],
    // Run tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Retry failed tests in CI
    retry: process.env.CI ? 2 : 0,
    // Keep alive for debugging
    watch: false,
    // Custom reporter for CI
    reporters: process.env.CI ? ['junit', 'default'] : ['default'],
    outputFile: './test-results.xml'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});