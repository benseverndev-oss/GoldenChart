# Design: MCP golden-snapshot coverage for SVG render tools

**Date:** 2026-05-26
**Status:** Approved (pending spec review)
**Topic:** Lock the SVG output of every MCP render tool with golden snapshots so refactors can't silently change what an agent receives.

## Problem

The MCP server (`mcp/`) exposes render tools whose SVG output is the agent-visible contract. Three tool groups are golden-snapshotted today (`chartTools` → `charts.test.ts`, `extraChartTools` → `extraCharts.test.ts`, `diagramTools` → `diagrams.test.ts`). The remaining SVG-emitting tools have only **structural** assertions (`startsWith('<svg')`, `toContain('<path')`, label-text checks). Structural checks pass even if the actual geometry, vibe application, or composition silently changes. A refactor (like the just-shipped font-embedding move) can alter agent-visible output with no failing test.

## Scope

Add a golden snapshot for **every SVG-emitting MCP tool not already covered**. Per the approved decision, this is SVG tools only — `export_png` (binary, cross-platform/version-sensitive), `export_svg` (wraps caller-provided SVG, so a golden would just pin arbitrary input), and the calc tools (numeric JSON, already unit-tested) are out of scope and keep their current tests.

### Tools to cover (11), by existing test file

| Test file | Tool(s) |
|-----------|---------|
| `mcp/src/primitiveTools.test.ts` | `render_rough_path`, `render_rough_rect`, `render_rough_circle`, `render_rough_line`, `render_rough_text` |
| `mcp/src/vibeTools.test.ts` | `preview_vibe` |
| `mcp/src/orchestrationTools.test.ts` | `compose_surface`, `build_flowchart_from_spec` |
| `mcp/src/dslTools.test.ts` | `render_diagram` (snapshot each diagram kind it already loops over), `build_diagram_from_mermaid` |
| `mcp/src/chartFeatures.test.ts` | `visualize_data` |

Note: `suggest_improvements` (also in `visualizeTool.ts`) returns a critique/analysis payload, not SVG — out of scope. If the executor finds it emits SVG, snapshot it too; otherwise leave it.

## Approach

Follow the established pattern from `charts.test.ts` verbatim:

1. Each tool already has a deterministic sample call (or a `SAMPLES` map) in its existing test file. **Reuse those inputs.** Add one `it('is deterministic (golden snapshot)', ...)` per tool (or per kind, for `render_diagram`) that calls the handler and `expect(result.content[0].text).toMatchSnapshot()`.
2. Do NOT create parallel test files. Add the snapshot assertions to the existing per-group test files, alongside the current structural assertions. This keeps tests co-located with their tools and matches the convention.
3. The `mcp/vitest.setup.ts` serializer already replaces embedded font bytes with a `<font-bytes>` placeholder, so snapshots stay readable and don't churn on font changes. No setup change needed.
4. Generate the snapshots with `vitest -u`, then inspect each committed `.snap` to confirm it contains real structure (an `<svg>` root, `<path>` geometry, expected labels) — not an error string or empty output.

## Determinism

Render tools resolve a vibe whose preset carries a default `seed`, so output is deterministic without an explicit seed — this is already proven by the existing chart/diagram snapshots. Reuse the existing sample inputs as-is. If any single tool's snapshot proves unstable across runs, pin an explicit `seed` in that one sample and leave a comment; do not globally change seeding.

## Small in-scope hardening (nearly free)

`export_png` stays structural per scope, but its current test only asserts `bytes > 0`. Strengthen it to also assert the PNG magic-byte header (`\x89PNG\r\n\x1a\n`) on the decoded base64, which catches a corrupt-rasterizer regression that a length check misses. This is a one-line assertion, not a golden snapshot, so it stays platform-stable. (If the executor judges this expands scope, it may defer it — it is a bonus, not a requirement.)

## Out of scope (YAGNI)

- No golden snapshot of `export_png` bytes (flaky across resvg versions / platform font rendering).
- No golden of `export_svg` (snapshots arbitrary caller input).
- No calc-tool JSON snapshots (pure D3 math, already unit-tested).
- No new test infrastructure, helpers, or refactoring of existing tests beyond adding the snapshot assertions.

## Testing / success criteria

- Every tool in the coverage table has a committed golden snapshot.
- `cd mcp && npm test` is green (after the standard root build + `--install-links` dep refresh, since mcp consumes built `goldenchart`).
- A deliberate tweak to any covered render path (e.g. nudging a primitive's geometry) fails its snapshot — proving drift is now caught. (Verify once during implementation, then revert.)
- Inspected snapshots contain genuine SVG structure, not error/empty output.

## Risks

- **Non-determinism in a specific tool:** mitigated by the default-seed behavior and the per-tool seed-pin fallback above.
- **Snapshot churn from the recent font move:** already settled — the font `<style>` placement is fixed and the serializer masks font bytes, so new snapshots are stable.
- **mcp/dist staleness (Windows):** the executor must rebuild root and refresh `mcp/node_modules/goldenchart` (`rm -rf` then `npm install --install-links`) before running mcp tests, or snapshots capture stale output.
