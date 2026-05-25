# Handoff — GoldenChart

Context for picking this project up in a fresh sandbox. The container is
ephemeral and clones the repo fresh, so everything you need is in git; nothing
local survives.

## What this is

GoldenChart is a hand-drawn / sketchy React charting + flowchart library, plus
an MCP server that exposes it as tools. The core idea is a strict separation:

- **Calculation layer** (`d3-scale`, `d3-shape`, `d3-hierarchy`) computes
  coordinates / path strings / layouts and **never touches the DOM**.
- **Rendering layer** (`roughjs`) turns that geometry into sketchy SVG paths.
- **Vibe engine** maps a semantic config (`messy_sketch` | `clean_blueprint` |
  `chaotic_notebook`, plus overrides) to concrete Rough.js options.

## Where work happens

- **Branch:** `claude/sketch-charting-lib-init-dg1LV` (all work; do not push to `main`).
- **PR:** #1 (open, ready for review).
- **Repo:** transferred to the **`benseverndev-oss`** org. NOTE: tooling access in
  this session may still be scoped to `benzsevern/goldenchart`; if GitHub API /
  PR-watch calls get denied, that's why — `git push` to the existing remote still
  works.
- **npm packages are scoped:** `@benseverndev-oss/goldenchart` and
  `@benseverndev-oss/goldenchart-mcp`.

## Layout

```
.                      # the library package (@benseverndev-oss/goldenchart)
├── src/
│   ├── types/         # VibeConfig, base props, geometry, chart data shapes
│   ├── vibe/          # presets + resolver + React context
│   ├── core/          # D3 calc layer: scales, shapes, ticks, arc, hierarchy, palette
│   ├── render/        # DOM-free roughjs generator + renderToString (server entry)
│   ├── primitives/    # RoughPath / Line / Rectangle / Circle / Text
│   ├── components/    # Surface, BarChart, LineChart, AreaChart, ScatterPlot, PieChart, Flowchart, Axis, Grid, Legend
│   ├── index.ts       # public entry
│   └── server.ts      # `@benseverndev-oss/goldenchart/server` -> renderToSVGString
├── mcp/               # the MCP server package (@benseverndev-oss/goldenchart-mcp)
│   └── src/           # registry, tools (charts/vibe/calc/primitives/orchestration/export), resources, prompts
├── playground/        # Vite demo app (imports the lib via alias)
├── .github/workflows/ # ci.yml, pages.yml, release.yml
└── ROADMAP.md         # the MCP server roadmap (M0–M5, all delivered)
```

## First-time setup (order matters)

```bash
npm install            # root: lib deps + tooling (eslint, prettier, vite, tsup, vitest)
npm run build          # builds dist/ — REQUIRED before the mcp package can resolve the library
cd mcp && npm install  # links node_modules/@benseverndev-oss/goldenchart -> ../../..  (file: dep)
```

If you skip `npm run build`, the mcp package can't resolve
`@benseverndev-oss/goldenchart` (no `dist/`), and its typecheck/tests fail.

## Common commands

Library (repo root):

```bash
npm run typecheck      # tsc --noEmit
npm test               # vitest (scoped to src/ via vitest.config.ts) — 25 tests
npm run build          # tsup -> dist (ESM + CJS + d.ts, incl. ./server entry)
npm run lint           # eslint . (covers src, mcp/src, playground/src)
npm run format         # prettier --check .   (format:write to fix)
npm run playground     # Vite dev server for the demo
```

MCP server (`cd mcp`):

```bash
npm run typecheck
npm test               # vitest — 47 tests (handlers + in-memory protocol round-trip)
npm run build          # tsup -> dist/index.js (executable bin, shebang)
npm run dev            # run the server from source via tsx (stdio)
```

Full green state: library 25 tests, mcp 47 tests, both typecheck + build clean,
playground builds, lint + prettier clean.

## Status — done

- Library: all chart types, primitives, vibe engine, axes/grid/legend, playground.
- MCP server (roadmap M0–M5, all 24 tools + 8 resources + 1 prompt):
  - M0 headless `renderToSVGString` + `bare` Surface + server scaffold
  - M1 six chart render tools + zod schemas + seeded SVG snapshots
  - M2 vibe tools (`list_vibe_presets`, `resolve_vibe`, `preview_vibe`)
  - M3 calc tools (`compute_*`, `layout_tree`) + primitive render tools
  - M4 `compose_surface`, `build_flowchart_from_spec`, `export_svg`/`export_png`
  - M5 resources (`vibe://`, `schema://chart/{type}`, `docs://`), `make-me-a-chart` prompt, packaging
- CI/CD: `ci.yml` (Node 18/20/22 matrix + lint job), `pages.yml` (playground ->
  GitHub Pages), `release.yml` (release-please -> npm publish both packages).

## Outstanding / needs a human

1. **`NPM_TOKEN`** org secret must exist and be granted to the repo, with publish
   rights to the `@benseverndev-oss` npm scope — otherwise the publish job 403s.
2. **Enable GitHub Pages** (source: GitHub Actions) for the playground deploy.
3. **Releases are Conventional-Commits driven** (release-please). Use `feat:` /
   `fix:` / `feat!:` commits on `main`; the existing `M0:` / `Flesh out…` history
   won't trigger version bumps.

## Gotchas

- The mcp package links the library via `file:..` (not an npm workspace). Build
  the library first; re-run `npm install` in `mcp/` if the library's package name
  or deps change.
- Root `vitest` is scoped to `src/` (see `vitest.config.ts`); the mcp package runs
  its own vitest. Don't expect `npm test` at root to run mcp tests.
- Pages needs a base path of `/<repo>/` — the workflow passes
  `--base=/${{ github.event.repository.name }}/` to the Vite build.
- PNG export uses `@resvg/resvg-js` (native). It's a normal dependency now and
  works on Linux CI; the tool degrades gracefully (returns an error result) if the
  binary is ever unavailable.
- SVG snapshot tests are deterministic because vibes carry fixed seeds. If you
  change rendering, snapshots in `mcp/src/__snapshots__/` will need updating
  (`vitest -u`).
