# Design: Close the MCP agent-surface drift gap (SP1)

**Date:** 2026-05-26
**Status:** Approved (design)
**Scope:** `mcp/` only — no `src/` (library) changes.

## Context

GoldenChart ships a library (`src/`) and an MCP server (`mcp/`) that exposes the
library to AI agents as tools. The MCP surface has drifted behind the library:
several capabilities the library fully supports are unreachable through the
tools, or are *advertised* by one tool but *rejected* by the tools that consume
them.

This is the first of two sub-projects under the goal "increase the surface of
primitives the agent can tweak":

- **SP1 (this doc):** close the drift gap — expose what the library already
  supports. No library changes, low risk.
- **SP2 (separate brainstorm):** add genuinely new primitives (polygon,
  arc/wedge, arrowhead/markers, polyline, …) to the library and the MCP surface.

## The gaps

1. **Vibe presets: 3 of 27 reachable.**
   `mcp/src/schemas.ts` hardcodes `VIBE_PRESET_NAMES = ['messy_sketch',
   'clean_blueprint', 'chaotic_notebook']`. `VibeConfigSchema` is built from that
   list and gates `resolve_vibe`, `preview_vibe`, and the `vibe` input of every
   chart and primitive render tool. Meanwhile `list_vibe_presets` iterates the
   full `VIBE_PRESETS` record and advertises all 27. Net effect: an agent
   discovers a preset like `pencil` or `synthwave`, passes it, and gets a
   validation rejection.

2. **`animate` knob missing.**
   The library's `VibeOverrides` includes `animate?: { drawOn?: boolean;
   durationMs?: number }` (the hand-drawn reveal). `VibeOverridesSchema` omits
   it, so an agent cannot request the reveal.

3. **`render_rough_text` drops `fill` and `maxWidth`.**
   The library's `RoughTextProps` supports `fill` (text colour override) and
   `maxWidth` (wrap width). The MCP `render_rough_text` input schema, the
   `PrimitiveSpecSchema` `text` variant, and the `primitiveToElement` `text`
   case all omit them.

A fourth candidate — per-primitive `vibe` on the single-primitive render
tools — was dropped from scope: `compose_surface` already carries per-primitive
`vibe` via `PrimitiveSpecSchema`, and a per-shape vibe is meaningless for a
single-primitive tool that owns its whole surface.

## Approach (chosen: A — runtime-derive)

The preset list should be sourced from a single source of truth so it cannot
drift again. Three options were considered:

- **A. Runtime-derive (chosen).** Build the enum from the library at runtime:
  `z.enum(Object.keys(VIBE_PRESETS) as [string, ...string[]])`. New presets
  added to the library appear in the MCP surface automatically. The schema loses
  its TypeScript literal-union type, but the tool handlers already cast
  `args.vibe as VibeConfig`, so there is no practical loss; runtime validation
  (what the agent actually hits) is preserved, and the JSON schema the agent
  sees lists all 27 names.
- B. Explicit `as const` tuple + a compile-time guard that it equals
  `keyof typeof VIBE_PRESETS`. Keeps literal types but still a manual list.
- C. Hardcode all 27. Rejected — drifts again on preset #28.

This realises ROADMAP principle #4 ("one source of truth for schemas — derive
tool input schemas from the existing TypeScript prop types").

## Changes

All changes are in `mcp/`. No library (`src/`) changes.

### `mcp/src/schemas.ts`
- Replace the hardcoded `VIBE_PRESET_NAMES` with a runtime list derived from
  `VIBE_PRESETS` (imported from `goldenchart`):
  `const VIBE_PRESET_NAMES = Object.keys(VIBE_PRESETS) as [string, ...string[]]`.
  `VibeOverridesSchema.preset` and `VibeConfigSchema` continue to use
  `z.enum(VIBE_PRESET_NAMES)`.
- Add `animate` to `VibeOverridesSchema`:
  `animate: z.object({ drawOn: z.boolean().optional(), durationMs:
  z.number().optional() }).optional()`.
- Add `fill: z.string().optional()` and `maxWidth: z.number().positive()
  .optional()` to the `PrimitiveSpecSchema` `text` variant.

### `mcp/src/primitiveTools.ts`
- Add `fill: z.string().optional()` and `maxWidth: z.number().positive()
  .optional()` to the `render_rough_text` input schema, and pass them through in
  the handler's `PrimitiveSpec`.

### `mcp/src/primitives.ts`
- In the `text` case of `primitiveToElement`, forward `fill: spec.fill` and
  `maxWidth: spec.maxWidth` to `RoughText`.

## Testing

- **Preset coverage:** assert `VibeConfigSchema` parses every name in
  `Object.keys(VIBE_PRESETS)`, and that the enum's option set equals
  `Object.keys(VIBE_PRESETS)` (catches drift in both directions).
- **Previously-blocked preset:** `preview_vibe` smoke test with a preset that
  was rejected before (e.g. `synthwave`) returns valid SVG.
- **`animate` round-trip:** `resolve_vibe` accepts `{ preset, animate: { drawOn:
  true } }` and the resolved output carries it.
- **Text knobs:** `render_rough_text` with `fill` and `maxWidth` produces SVG
  (wrapped text / coloured fill present in output).
- **Regression:** existing snapshot and tool-count tests stay green. The
  `list_vibe_presets` test already uses `arrayContaining`, so expanding the set
  does not break it.

## Out of scope

- Any new primitive shapes or knobs (SP2).
- Enhancing `preview_vibe` to render a gallery of all presets.
- Library (`src/`) changes of any kind.

## Risks

- `z.enum` with a runtime-built tuple: the type narrows to `string` rather than a
  literal union. Acceptable — handlers cast to `VibeConfig`, and `resolveVibe`
  validates semantics downstream. An unknown preset string would still be caught
  by the enum (only the 27 real keys are in it).
