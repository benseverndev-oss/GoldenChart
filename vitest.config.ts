import { defineConfig } from 'vitest/config';

// Keep the library's test run scoped to its own source; the mcp/ package has
// its own vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // Barrel files and the generated font blob carry no testable branches.
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/assets/fonts.ts'],
    },
  },
});
