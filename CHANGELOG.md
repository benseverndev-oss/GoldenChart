# Changelog

All notable changes to `goldenchart` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The MCP server (`goldenchart-mcp`) versions independently; see `mcp/`.

## [Unreleased]

### Changed
- **Dev tooling:** migrated the playground to Tailwind 4 (CSS-first config via
  `@import "tailwindcss"` + `@source`, the `@tailwindcss/postcss` plugin;
  `autoprefixer` is now bundled and was dropped). Removed the unshipped root
  `tailwind.config.ts` and `playground/tailwind.config.js`. **No consumer
  impact** — the published library ships no Tailwind/CSS; these files were never
  in the npm `files` list (#115).

## [0.3.0]

### Added
- **Accessibility:** every core chart (`BarChart`, `LineChart`, `AreaChart`,
  `PieChart`, `ScatterPlot`) now emits a fallback `<desc>` derived from its
  data when no explicit `description` is passed — e.g. "Bar chart with 4
  categories, values from 7 to 24." New `src/core/a11yDescribe.ts` ships the
  per-chart-type generators; new `src/components/a11y.test.ts` covers role /
  title / desc plumbing across charts (#119).
- **`<ResponsiveContainer>`** — `ResizeObserver`-backed render-prop wrapper
  so charts fill their parent. Supports `aspectRatio`, `minWidth` /
  `minHeight` / `maxHeight`, debounced updates, and an SSR-safe `defaultSize`
  (#120).
- **Client-side export.** `toSvgString`, `toPng`, `downloadChart`,
  `copyToClipboard`, plus `chartSvgFrom` / `svgPixelSize` helpers, exported
  from the main entry. `<Surface>` accepts a new `svgRef?: Ref<SVGSVGElement>`
  prop so consumers can grab the inner `<svg>` cleanly (#123).
- **Themed brands.** New `ThemedBrand` shape (`{ mode?, light, dark }`),
  `useColorScheme()` subscribing to `prefers-color-scheme`, and
  `useResolvedBrand(brand)` combining them. `<BrandProvider>` now auto-themes;
  plain `Brand` passes through unchanged. SSR-safe — defaults to `'light'`
  until a browser is available (#125).
- **Opt-in data-change transitions.** `transitions?: { enabled?, durationMs? }`
  on `BarChart`, `LineChart`, `AreaChart`, `PieChart` — wraps the data prop
  in `useDataTransition` so prop changes tween instead of snapping. Honours
  `prefers-reduced-motion`. Off by default (#126).
- **Astro Starlight docs site** under `docs-site/` with seed pages for Quick
  start, Brand vs. vibe, BarChart reference, Responsive / Dark mode / Export
  recipes, MCP overview, and the Vibe gallery. `npm run docs:dev` /
  `docs:build` proxy in (#128, phase 1).

### Fixed
- `resolveVibe` no longer returns `undefined` for an unknown preset name. A
  typo'd preset now falls back to the default vibe and logs a one-line warning
  listing the valid presets, instead of crashing downstream with
  `Cannot read properties of undefined`.
- Non-finite data (`NaN` / `±Infinity`) no longer hangs the renderer. `extentOf`
  ignores non-finite values so a single bad datum can't poison an axis domain,
  and the rough primitives (`RoughRectangle`, `RoughCircle`, `RoughLine`,
  `RoughPath`) skip degenerate geometry instead of sending Rough.js' hachure fill
  into an unbounded loop.

### Internal
- `npm run test:coverage` (v8 provider) for a coverage report.
- Edge-case tests for empty / single / negative / zero / non-finite data.

## [0.1.0]

- Initial public release: hand-drawn React charts and diagrams (D3 math +
  Rough.js rendering + a Vibe engine), a headless `goldenchart/server` entry, an
  opt-in `goldenchart/fonts` subpath, and the `goldenchart-mcp` server.

[Unreleased]: https://github.com/benseverndev-oss/GoldenChart/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/benseverndev-oss/GoldenChart/compare/v0.2.0...v0.3.0
[0.1.0]: https://github.com/benseverndev-oss/GoldenChart/releases/tag/v0.1.0
