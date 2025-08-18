import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.performance.test.ts'],
    // Performance tests need longer timeouts
    testTimeout: 120000, // 2 minutes
    // Don't run in parallel to get accurate performance measurements
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Disable coverage for performance tests
    coverage: {
      enabled: false
    },
    // Custom reporter for performance results
    reporters: ['default', 'junit'],
    outputFile: './performance-results.xml',
    // Benchmark-specific configuration
    benchmark: {
      reporters: ['default', 'json'],
      outputFile: './benchmark-results.json'
    }
  }
});