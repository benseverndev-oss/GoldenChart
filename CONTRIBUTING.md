# Contributing to GoldenChart

Thanks for your interest in improving GoldenChart. This repo holds two packages:
the `goldenchart` library (root) and the `goldenchart-mcp` server (`mcp/`).

## Development setup

```bash
npm install
npm run build       # bundle with tsup (ESM + CJS + types)
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run playground  # interactive Vite demo of every chart + vibe
```

For the MCP server, run its commands from `mcp/`:

```bash
cd mcp
npm test
npm run typecheck
npm run build
```

After changing library `src/`, the MCP package needs the rebuilt `dist/`:

```bash
npm run build
rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)
```

## Architecture, in one line

D3 computes coordinates (`src/core`, DOM-free), Rough.js sketches them
(`src/primitives` + `src/render`), and the Vibe engine (`src/vibe`) maps a
semantic preset to concrete Rough.js options. Keep the calculation layer free of
the DOM and rendering concerns.

## Ground rules

- **Test-first.** New behavior and bug fixes ship with a test. Run `npm test`
  (and `npm run typecheck`) before opening a PR.
- **Keep the browser bundle font-free.** Never import `src/assets/fonts` from
  `src/index.ts` or `Surface.tsx`. `npm run check:bundle` enforces this (and a
  75 KB gzipped ceiling) and runs in CI.
- **Output-affecting changes** ship a before/after render: `cd mcp && npm run compare`.
- **Don't commit snapshot churn.** Line-ending-only `.snap` diffs are normalized
  by `.gitattributes`; if any still appear, `git checkout --` them.

## Pull requests

1. Branch off `main`.
2. Make the change with tests; keep the diff focused.
3. Ensure `npm test`, `npm run typecheck`, and `npm run check:bundle` pass.
4. Open the PR with a clear description of what changed and why.

## Releases

Releases are tag-triggered with npm provenance. Bump the relevant
`package.json` version first (the workflow guards tag == version):

- `v*` tag → publishes `goldenchart`
- `mcp-v*` tag → publishes `goldenchart-mcp`
- push to `main` → deploys the playground to GitHub Pages

## License

By contributing you agree your contributions are licensed under the MIT License.
