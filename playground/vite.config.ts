import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));

// The playground imports the library straight from source so edits show up live.
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project page under /GoldenChart/; dev stays at /.
  base: command === 'build' ? '/GoldenChart/' : '/',
  root: dir,
  plugins: [react()],
  resolve: {
    alias: {
      // More-specific subpath alias must precede the bare package alias.
      'goldenchart/interactive': resolve(dir, '../src/interactive.ts'),
      goldenchart: resolve(dir, '../src/index.ts'),
    },
  },
}));
