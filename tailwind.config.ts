import type { Config } from 'tailwindcss';

/**
 * Consumers extend this from their own tailwind.config so the wrapper/container
 * utility classes GoldenChart emits get included in their build.
 */
const config: Config = {
  content: ['./node_modules/@benseverndev-oss/goldenchart/dist/**/*.{js,cjs}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
