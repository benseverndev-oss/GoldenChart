# GoldenChart docs site

Astro Starlight site. Independent of the library build; deployed under
`/docs/` of the GitHub Pages site alongside the existing playground.

## Local development

```bash
cd docs-site
npm install
npm run dev
```

Open <http://localhost:4321/GoldenChart/docs>.

## Status

Phase 1 scaffold — only seed pages are filled in (Quick start, Brand vs. vibe,
BarChart reference, Responsive / Dark mode / Export recipes, MCP overview,
Vibe gallery). Filling in the remaining 14 chart pages, auto-generating prop
tables off the TypeScript types, and wiring CI deploy are tracked under #128
follow-ups.
