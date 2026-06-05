import tailwindcss from '@tailwindcss/postcss';

// Tailwind 4 ships its own PostCSS plugin and bundles autoprefixer, so the
// standalone `autoprefixer` dep is gone. Content is auto-detected from the Vite
// entrypoints; the library glob is declared via `@source` in `index.css`.
export default {
  plugins: [tailwindcss],
};
