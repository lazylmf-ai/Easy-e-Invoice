import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'tests/e2e/**',
      'tests/performance/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '.next/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.d.ts',
        'coverage/',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000
  }
});