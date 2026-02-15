import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      // TODO(v2): Raise all thresholds to >= 80% once remaining utility/CLI gaps are covered.
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 87,
        branches: 66,
      },
      exclude: [
        'node_modules/',
        'dist/',
        'scripts/benchmark/',
        'scripts/coverage/',
        'scripts/coverage-p1-gate.mjs',
        'tests/fixtures/',
        '**/*.test.ts',
        'vitest.config.ts',
        'src/cli.ts',
        'src/index.ts',
      ],
    },
  },
});
