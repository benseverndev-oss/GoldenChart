import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));

// The playground imports the library straight from source so edits show up live.
export default defineConfig({
  root: dir,
  plugins: [react()],
  resolve: {
    alias: {
      '@benseverndev-oss/goldenchart': resolve(dir, '../src/index.ts'),
    },
  },
});
