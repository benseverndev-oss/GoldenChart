# Changelog

All notable changes to `goldenchart` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The MCP server (`goldenchart-mcp`) versions independently; see `mcp/`.

## [Unreleased]

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

### Added
- `npm run test:coverage` (v8 provider) for a coverage report.
- Edge-case tests for empty / single / negative / zero / non-finite data.

## [0.1.0]

- Initial public release: hand-drawn React charts and diagrams (D3 math +
  Rough.js rendering + a Vibe engine), a headless `goldenchart/server` entry, an
  opt-in `goldenchart/fonts` subpath, and the `goldenchart-mcp` server.

[Unreleased]: https://github.com/benseverndev-oss/GoldenChart/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/benseverndev-oss/GoldenChart/releases/tag/v0.1.0
