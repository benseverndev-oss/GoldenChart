import { defineConfig } from 'vitest/config';

// Keep the library's test run scoped to its own source; the mcp/ package has
// its own vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
