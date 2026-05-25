import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  // Shebang so the published bin is directly executable.
  banner: { js: '#!/usr/bin/env node' },
  // Resolve these from node_modules at runtime, not bundled.
  external: ['goldenchart', 'goldenchart/server', 'react', 'react-dom', '@resvg/resvg-js'],
});
