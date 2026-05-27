# Interactivity — Phase 4: Ecosystem

**Parent:** [interactivity-roadmap](./2026-05-27-interactivity-roadmap.md) · **Status:** Spec · **Date:** 2026-05-27 · **Depends on:** Phase 1 (MCP embed); Phases 2–3 (playground/docs completeness)

Extends interactivity to the surfaces that make GoldenChart distinctive: the MCP
server (the agent story nobody else has), the playground, and the docs. Can start
once Phase 1 lands and continues alongside Phases 2–3.

## Goal

An agent can emit an interactive embed; the playground demonstrates every
interaction; the docs teach the interaction API.

## Scope

**In:** an MCP tool output that bundles static SVG + a hydration snippet;
playground interaction controls + live event log; interaction docs/recipes and
per-component prop reference.

**Out:** new chart-level interaction features (those are Phases 1–3).

## 1. MCP interactive embed

Today the MCP server renders to SVG strings. Add an **opt-in** output that yields
a self-contained interactive embed:

- Static SVG (already `data-gc-*` tagged from Phase 0) + a small inlined hydration
  script that boots `goldenchart/interactive`'s delegation against that SVG.
- Reuses the headless font embedding the server already does (`goldenchart/server`
  auto-embeds `@font-face`), so the embed renders identically offline.
- Shape it as a new tool/option (e.g. an `interactive: true` flag or a distinct
  `render_interactive_*` tool) rather than changing existing tool output — the
  golden-snapshotted SVG tools stay byte-stable.

This is the differentiator: an agent producing charts a reader can hover and
filter, not just static images.

## 2. Playground

- Add interaction controls to `playground/` (mirrors the existing Brand/Vibe
  controls): toggles for tooltip / highlight / selection / legend-toggle /
  crosshair / zoom / brush / transition.
- A live event log panel showing `onHover`/`onSelect`/`onBrush` payloads.
- A "linked charts" demo for the Phase 3 crossfilter.

## 3. Docs

- New `docs/INTERACTIVITY.md`: the progressive-enhancement model, the
  `data-gc-*` contract, `<InteractiveChart>` usage, recipes (tooltip formatter,
  legend toggle, linked dashboard).
- Extend `docs/API.md` with the interaction props per component.
- README: a short "Interactivity (opt-in)" section pointing at
  `goldenchart/interactive`, emphasizing the static core stays untouched.

## Implementation notes

- MCP ↔ library coupling rule still applies: after changing `src/`, rebuild root
  then refresh the `mcp/` copy (`npm run build` then reinstall with
  `--install-links`) before the MCP embed tool can use new exports.
- Carry forward a `cd mcp && npm run compare` render for any output-affecting MCP
  change, and regen README assets via `npm run assets` if the embed appears there.

## Accessibility

- The MCP embed must carry the same a11y as in-app: focusable marks, tooltip
  `aria-describedby`, and the visually-hidden `dataTable` baked into the SVG.

## SSR / invariants

- The embed's *static* layer is the existing server output; interactivity is the
  hydration script. With scripts blocked, the embed is a normal static chart.
- No change to existing MCP tool outputs; the interactive embed is additive.

## Tests

- MCP: golden-snapshot the static portion of the interactive embed (mask font
  bytes as `mcp/vitest.setup.ts` already does); assert the hydration script is
  present and references the tagged SVG.
- Playground: smoke test that controls drive the documented props.

## Acceptance

- An MCP call returns a self-contained interactive embed that hovers/filters
  offline; the playground exercises every interaction with a live event log; docs
  cover the full interaction API. Existing MCP snapshots unchanged.

## Risks

- **Embed weight** — inlining the interactive runtime per embed is heavy; prefer
  referencing a CDN/global build or a single shared script when emitting many
  embeds.
- **MCP snapshot stability** — keep the interactive embed a separate tool/flag so
  the existing snapshotted SVG tools don't churn.
