/** @type {import('tailwindcss').Config} */
// Globs are resolved from the repo root (the cwd Vite runs in).
export default {
  content: ['playground/index.html', 'playground/src/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
