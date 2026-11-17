import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'apps/api/tests/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    environment: 'node',
  },
});
