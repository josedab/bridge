import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      outputFile: './benchmarks/results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli/index.ts',
      ],
      // Current coverage: ~53%. Incrementally increase thresholds as tests are added.
      // Target: 80% lines/functions/statements, 75% branches
      // See: https://github.com/bridge-codes/bridge/issues - "good first issue" for test contributions
      thresholds: {
        lines: 53,
        functions: 63,
        branches: 70,
        statements: 53,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
