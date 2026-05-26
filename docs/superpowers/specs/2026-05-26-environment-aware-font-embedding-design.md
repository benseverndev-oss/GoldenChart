# Design: Environment-aware font embedding

**Date:** 2026-05-26
**Status:** Approved (pending spec review)
**Topic:** Cut the GoldenChart browser bundle by moving font embedding off the main entry.

## Problem

The main library entry ships ~443 KB gzipped, almost entirely font data.

`src/components/Surface.tsx:95` calls `bundledFontFor(resolved.fontFamily)` on every
chart render to embed the vibe's font as an `@font-face` data URI, so the SVG is
self-contained. That function indexes one module, `src/assets/fonts.ts`, which holds
all **16 distinct font files** (~808 KB of base64) in a single `FONT_TTF_BASE64`
record. Two facts make the whole blob unavoidable for any consumer:

1. `Surface.tsx:6` statically imports `bundledFontFor`, so importing *any* chart
   pulls the fonts module into the bundle graph.
2. `src/index.ts:18` *also* re-exports `FONT_TTF_BASE64, bundledFontFor, primaryFamily`
   from the main entry, which would retain the fonts module even if (1) were fixed.

Because `FONT_TTF_BASE64` is one object literal accessed dynamically by family name,
no bundler can tree-shake individual fonts. A consumer using one vibe ships all 16.

## Key insight

The font *bytes* are only strictly required on the **headless** render path
(`goldenchart/server` → resvg / PNG export), where there is no browser to load a
webfont. In a browser the page can load the webfont via normal CSS, or fall back.
And `goldenchart/server` is already a separate entry point, so bundle size there is
irrelevant.

`RoughText` (`src/primitives/RoughText.tsx:59`) always sets
`fontFamily={resolved.fontFamily}` on text, so the `font-family` reference is present
in the output regardless of whether the bytes are embedded. CSS-only rendering already
works; embedding is purely additive.

## Design

The browser bundle stops referencing the fonts module entirely. The headless renderer
embeds fonts by auto-detecting which families the rendered SVG actually uses. No prop
threading through chart components; no signature change to `renderToSVGString` and
therefore no edits to the 8 MCP call sites.

### 1. `src/components/Surface.tsx` — stop embedding

- Remove the `import { bundledFontFor } from '../assets/fonts'` (line 6).
- Remove the `font` / `fontFace` computation (lines 95–99) and the
  `{fontFace ? <style .../> : null}` node (line 115).
- Leave the draw-on `<style>` and everything else untouched.

This deletion removes the fonts module from the main bundle's import graph. Charts
still emit `font-family` via `RoughText`, so CSS-only output is visually unchanged
wherever the font is available to the renderer.

### 2. `src/index.ts` — move font exports off the main entry

Remove `export { FONT_TTF_BASE64, bundledFontFor, primaryFamily } from './assets/fonts'`
(line 18). This is required in addition to (1): the re-export alone keeps the fonts
module in the browser bundle.

### 3. New subpath `goldenchart/fonts` (`src/fonts.ts`)

Re-exports the moved symbols plus a convenience helper:

- `FONT_TTF_BASE64`
- `bundledFontFor`
- `primaryFamily`
- `fontFaceFor(vibe: VibeConfig): string | undefined` — resolves a vibe, looks up its
  bundled font, and returns the ready `@font-face` CSS string (or `undefined` for a
  system-font vibe). This is the same CSS the headless path builds, factored into one
  shared function so both call sites agree. Implemented with `resolveVibe`
  (`src/vibe/resolveVibe.ts`) and the `VibeConfig` type (`src/types/vibe.ts`) — both
  already exist; this module is the first place outside a component to call
  `resolveVibe`, so the plan should import it explicitly rather than assume scope.

Browser users who want self-contained output import from this subpath and inject the
returned CSS into their document. Opt-in: only they pay the bytes, and tree-shaking
still drops fonts for everyone else (the symbol lives behind a subpath the main entry
never imports).

Wiring:
- `package.json` `exports`: add `"./fonts"` mapping to the built `dist/fonts.{js,cjs}`
  + types, mirroring the existing `"./server"` block.
- `tsup.config.ts` `entry`: add `'src/fonts.ts'` to `['src/index.ts', 'src/server.ts']`.

### 4. `src/render/renderToString.ts` — embed on the headless path

After `renderToStaticMarkup(element)`:

1. Collect every `font-family` value present in the markup.
2. Map each through `primaryFamily` to its primary family name.
3. For each distinct family that has bundled bytes (`bundledFontFor`), build one
   `@font-face` rule (reusing the shared `fontFaceFor` builder).
4. Splice a single `<style>` containing those rules into the SVG immediately after
   the opening `<svg ...>` tag, deduplicated and sorted by family name for
   deterministic output. (Placement is fixed here rather than left open so the
   headless-parity snapshot pins one stable position.)

Imports `bundledFontFor` here. Because `renderToString.ts` is reachable only from
`src/server.ts` (`goldenchart/server`) and never from `src/index.ts`, the fonts module
lands only in the server bundle.

Multi-vibe `compose_surface` output (where several families appear) is handled
naturally: every referenced bundled family is embedded.

The existing `renderToSVGString(element)` signature is unchanged, so
`registry.ts`, `orchestrationTools.ts`, `primitiveTools.ts`, `vibeTools.ts`,
`dslTools.ts`, and `visualizeTool.ts` need no edits.

## Module boundaries

| Module | Responsibility | Imports fonts? |
|--------|----------------|----------------|
| `src/index.ts` (browser entry) | charts, primitives, vibe, core | **No** |
| `src/components/Surface.tsx` | container + accessibility + draw-on | **No** |
| `src/fonts.ts` (`goldenchart/fonts`) | font bytes + lookup + `fontFaceFor` | Yes (opt-in) |
| `src/render/renderToString.ts` (via `goldenchart/server`) | headless render + auto-embed | Yes (Node only) |

`fontFaceFor` is the single source of truth for the `@font-face` CSS, shared by the
subpath (browser opt-in) and the headless renderer.

## Out of scope (YAGNI)

- **No `embedFonts` prop on `Surface`.** A boolean prop would force a static fonts
  import into the main entry and undo the entire win. Browser opt-in *must* go through
  the `goldenchart/fonts` subpath.
- **No per-vibe preset/font split.** `VIBE_PRESETS` is also a single record, but
  splitting it is a large refactor with a dynamic-vibe edge case, and unnecessary once
  fonts are off the browser entry.
- **No pure non-React serializer.** Separate, much larger effort; not touched here.
- **No back-compat re-export of font symbols on the main entry.** The library is
  unshipped (0.0.1); moving them cleanly is correct.

## Testing

- **Bundle guard (new test):** assert the built `dist/index.js` contains no
  `data:font/ttf;base64` substring and stays under a size budget. The assertion
  threshold is ~150 KB (a generous guard ceiling); actual is expected to land far
  below it (tens of KB), so a much smaller number is success, not cause for concern.
  This locks the win against regression. Requires the build to run before the
  assertion (or a dedicated script).
- **Headless parity:** regenerate the 3 MCP snapshot files (`charts.test.ts`,
  `diagrams.test.ts`, `extraCharts.test.ts`); add an assertion that a chart rendered
  via `renderToSVGString` still contains its `@font-face` rule. The embedded font *set*
  is unchanged from today; only the `<style>` placement moves, so the diff is
  structural, not visual.
- **Subpath unit tests:** `fontFaceFor(vibe)` returns valid `@font-face` CSS containing
  the resolved family for a bundled-font preset, and `undefined` for a system-font vibe.
- **Visual before/after:** this change affects output (browser loses the embedded font
  by default; headless `@font-face` placement moves), so per the project's standing
  process it ships a carried-forward `npm run compare` render — browser CSS-only vs.
  headless embedded — in the PR.

## Expected outcome

- Main entry (`dist/index.js`): **~443 KB → tens of KB gzipped** (chart + d3 + rough).
- Headless / MCP output: same fonts embedded as today (content-identical; `<style>`
  position differs).
- Self-contained SVGs remain the default on the path that requires them (headless),
  and are one subpath import away for browser consumers who want them.

## Risks

- **Auto-detection false positives:** a bundled family name could appear in chart text
  content, not just a `font-family` value. Mitigation: scope detection to `font-family`
  occurrences rather than scanning raw text. Worst case embeds one extra font (larger
  output, no visual harm).
- **Snapshot churn:** expected and bounded to 3 files; visually verified via the
  compare harness.
