# scripts/

Dev-only helpers. None of these run in CI.

## Bundle guard

- **`check-bundle.mjs`** — wired into `npm run check:bundle` (and CI). Fails the
  build if font bytes leak into the browser entry or it exceeds the gzipped budget.

## Gallery / example generators

These render the library to PNGs for visual review and for the README/gallery
images. They're not part of the build or test pipeline; their output directories
(`gallery/`, `nl-examples/`) are gitignored.

**Prerequisites** (once): build the library and make sure the rasterizer is
available — the scripts resolve `@resvg/resvg-js` from `mcp/node_modules`.

```bash
npm run build
cd mcp && npm install && cd ..
```

Then run any generator from the repo root:

| Script | Renders | Output |
| --- | --- | --- |
| `node scripts/gallery.mjs [vibe]` | every data chart in one vibe (default `pencil`) | `gallery/<vibe>-*.png` |
| `node scripts/diagram-gallery.mjs [vibe]` | the diagram family (flowchart, mindmap, org, sequence, ER, timeline, mermaid) | `gallery/<vibe>-dg-*.png` |
| `node scripts/brand-examples.mjs` | charts under two brand kits (ACME, MANGO) | `gallery/branded/*.png` |
| `node scripts/nl-examples.mjs` | a spread of natural-language `query` results | `nl-examples/*.png` |
