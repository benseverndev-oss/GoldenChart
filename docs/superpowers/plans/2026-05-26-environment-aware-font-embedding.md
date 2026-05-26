# Environment-aware Font Embedding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move font embedding off the GoldenChart main browser entry so consumers stop shipping ~443 KB of fonts, while the headless renderer keeps producing self-contained SVGs.

**Architecture:** The browser entry (`goldenchart`) stops importing the fonts module entirely. Font bytes live behind a new `goldenchart/fonts` subpath (opt-in) and are embedded automatically by the headless renderer (`goldenchart/server`), which auto-detects the `font-family` values present in the rendered SVG and splices in matching `@font-face` rules. A single low-level `fontFaceCss` builder is the one source of truth for the `@font-face` string.

**Tech Stack:** TypeScript, React 18, tsup (ESM+CJS+dts), vitest, Rough.js/d3. The `mcp/` workspace consumes the built `goldenchart` package from `dist/`.

**Spec:** `docs/superpowers/specs/2026-05-26-environment-aware-font-embedding-design.md`

---

## Background the executor needs

- **Two library entries today** (`tsup.config.ts` → `entry: ['src/index.ts', 'src/server.ts']`):
  - `goldenchart` (`src/index.ts`) — browser: charts, primitives, vibe, core. Currently *also* re-exports the font symbols (line 18) — this is part of the bug.
  - `goldenchart/server` (`src/server.ts`) — headless `renderToSVGString`, Node-only.
- **The bloat has two causes**, both must be removed:
  1. `src/components/Surface.tsx:6` statically imports `bundledFontFor` and calls it (`:95`) to embed a `@font-face` via an inline `<style>` node.
  2. `src/index.ts:18` re-exports `FONT_TTF_BASE64, bundledFontFor, primaryFamily`.
- **`bundledFontFor(fontFamily)`** (`src/assets/fonts.ts`) takes a CSS font-family *stack*, runs `primaryFamily` to get the first unquoted name, and returns `{ family, ttfBase64 } | undefined`.
- **HTML-entity gotcha (important):** `renderToStaticMarkup` escapes `"` inside attribute values to `&quot;`. Many preset families are double-quoted (e.g. `'"Comic Neue", cursive'`). So a `font-family` value scanned out of the rendered markup looks like `&quot;Comic Neue&quot;, cursive` and must be entity-decoded *before* `bundledFontFor`, or the lookup misses. This is the single most error-prone part of the change — Task 3 has a test specifically for it.
- **Downstream importers of the font symbols from `'goldenchart'`** that will break when the export moves and must switch to `'goldenchart/fonts'`:
  - `mcp/src/exportTools.ts:5` — `import { FONT_TTF_BASE64 } from 'goldenchart'` (the `export_png` tool; production code, has tests).
  - `mcp/scripts/compare-agent-surface.mjs:25` — `FONT_TTF_BASE64`.
  - `mcp/scripts/generate-assets.mjs` — imports a font symbol (confirm which).
- **mcp ↔ dist coupling (Windows):** the `mcp/` workspace resolves `goldenchart` from the built `dist/`. After changing anything in `src/`, you must rebuild the root (`npm run build`) and refresh the mcp copy before mcp typecheck/test/compare see the change. Per project note: `file:..` symlink is unreliable on Windows — reinstall mcp deps with `--install-links` and force-recopy after src changes. Always rebuild root before running anything in `mcp/`.
- **Run tests from the right place:** library tests `npm test` (repo root); mcp tests `cd mcp && npm test` (after a fresh root build + dep refresh).

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/assets/fonts.ts` | Modify | Add `fontFaceCss(font)` — the single `@font-face` string builder. Keeps the data + low-level helpers. |
| `src/fonts.ts` | **Create** | `goldenchart/fonts` subpath entry: re-export `FONT_TTF_BASE64`, `bundledFontFor`, `primaryFamily`, `fontFaceCss`; add `fontFaceFor(vibe)`. |
| `package.json` | Modify | Add `"./fonts"` to `exports`. |
| `tsup.config.ts` | Modify | Add `'src/fonts.ts'` to `entry`. |
| `src/render/renderToString.ts` | Modify | Auto-detect used families and splice `@font-face` into headless output. |
| `src/components/Surface.tsx` | Modify | Remove the font import + embedding. |
| `src/index.ts` | Modify | Remove the font re-export (line 18). |
| `mcp/src/exportTools.ts` | Modify | Import `FONT_TTF_BASE64` from `goldenchart/fonts`. |
| `mcp/scripts/compare-agent-surface.mjs` | Modify | Import `FONT_TTF_BASE64` from `goldenchart/fonts`. |
| `mcp/scripts/generate-assets.mjs` | Modify | Import font symbol from `goldenchart/fonts`. |
| `scripts/check-bundle.mjs` | **Create** | Guard: built `dist/index.js` has no font bytes + under size budget. |
| `.github/workflows/ci.yml` | Modify | Run the bundle guard after the library build. |
| `src/assets/fonts.test.ts` | **Create** | Test `fontFaceCss`. |
| `src/fonts.test.ts` | **Create** | Test `fontFaceFor`. |
| `src/render/renderToString.test.ts` | **Create** | Test headless embed + entity decode + CSS-only fallback. |
| `src/components/Surface.test.ts` | **Create** | Test Surface emits no `@font-face` but keeps `font-family`. |
| `README.md`, `mcp/README.md` | Modify | Document the new default + opt-in. |

---

## Task 1: Shared `fontFaceCss` builder

Extract the `@font-face` string into one function so the subpath and the headless renderer produce byte-identical CSS (matching today's output exactly).

**Files:**
- Modify: `src/assets/fonts.ts`
- Test: `src/assets/fonts.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/assets/fonts.test.ts
import { describe, expect, it } from 'vitest';
import { fontFaceCss } from './fonts';

describe('fontFaceCss', () => {
  it('builds the exact @font-face rule used today', () => {
    const css = fontFaceCss({ family: 'Caveat', ttfBase64: 'QUJD' });
    expect(css).toBe(
      "@font-face{font-family:'Caveat';font-style:normal;font-weight:400;" +
        "src:url(data:font/ttf;base64,QUJD) format('truetype');}",
    );
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- src/assets/fonts.test.ts`
Expected: FAIL — `fontFaceCss` is not exported.

- [ ] **Step 3: Implement `fontFaceCss` in `src/assets/fonts.ts`**

Add below the existing helpers:

```ts
/**
 * The single source of truth for the `@font-face` rule that makes an SVG
 * self-contained. Used by the headless renderer and the `goldenchart/fonts`
 * opt-in helper so both emit byte-identical CSS.
 */
export function fontFaceCss(font: { family: string; ttfBase64: string }): string {
  return (
    `@font-face{font-family:'${font.family}';font-style:normal;font-weight:400;` +
    `src:url(data:font/ttf;base64,${font.ttfBase64}) format('truetype');}`
  );
}
```

> Confirm this string matches the rule currently built in `Surface.tsx:96-98` character-for-character, so the only headless snapshot change is the `<style>` position, not its contents.

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -- src/assets/fonts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assets/fonts.ts src/assets/fonts.test.ts
git commit -m "Add shared fontFaceCss builder"
```

---

## Task 2: `goldenchart/fonts` subpath + `fontFaceFor`

**Files:**
- Create: `src/fonts.ts`
- Modify: `package.json`, `tsup.config.ts`
- Test: `src/fonts.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/fonts.test.ts
import { describe, expect, it } from 'vitest';
import { fontFaceFor, bundledFontFor, FONT_TTF_BASE64 } from './fonts';

describe('goldenchart/fonts subpath', () => {
  it('re-exports the font data + lookup', () => {
    expect(typeof FONT_TTF_BASE64).toBe('object');
    expect(bundledFontFor("'Caveat', cursive")?.family).toBe('Caveat');
  });

  it('fontFaceFor returns @font-face CSS for a bundled-font vibe', () => {
    const css = fontFaceFor('pencil'); // pencil → Caveat (bundled)
    expect(css).toContain('@font-face');
    expect(css).toContain("font-family:'Caveat'");
  });

  it('fontFaceFor returns undefined for a non-bundled family', () => {
    expect(fontFaceFor({ preset: 'pencil', fontFamily: 'Arial, sans-serif' })).toBeUndefined();
  });
});
```

> Note: confirm `pencil` resolves to `Caveat` (it does per `src/vibe/presets.ts`). Confirm `VibeConfig` allows a `fontFamily` override; if not, replace the third test's input with a bare unknown family passed through `bundledFontFor` directly.

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- src/fonts.test.ts`
Expected: FAIL — `./fonts` module does not exist.

- [ ] **Step 3: Create `src/fonts.ts`**

```ts
// `goldenchart/fonts` — opt-in font bytes + helpers. Kept off the main entry so
// browser consumers only pay for fonts when they explicitly want self-contained
// SVGs. The headless renderer embeds fonts automatically (see src/render).
import type { VibeConfig } from './types/vibe';
import { resolveVibe } from './vibe/resolveVibe';
import { FONT_TTF_BASE64, bundledFontFor, primaryFamily, fontFaceCss } from './assets/fonts';

export { FONT_TTF_BASE64, bundledFontFor, primaryFamily, fontFaceCss };

/**
 * The `@font-face` CSS for a vibe's bundled font, or `undefined` if the vibe
 * uses a system font. Inject the returned string into your document (or an SVG
 * `<style>`) to make a browser-rendered chart self-contained.
 */
export function fontFaceFor(vibe?: VibeConfig): string | undefined {
  const font = bundledFontFor(resolveVibe(vibe).fontFamily);
  return font ? fontFaceCss(font) : undefined;
}
```

> Verify import paths against the repo: `VibeConfig` is in `src/types/vibe.ts`; `resolveVibe` is exported from `src/vibe/resolveVibe.ts`.

- [ ] **Step 4: Wire the subpath into the build**

In `tsup.config.ts`, change the entry array:

```ts
entry: ['src/index.ts', 'src/server.ts', 'src/fonts.ts'],
```

In `package.json` `exports`, add after the `"./server"` block:

```json
    "./fonts": {
      "types": "./dist/fonts.d.ts",
      "import": "./dist/fonts.js",
      "require": "./dist/fonts.cjs"
    }
```

- [ ] **Step 5: Run it, verify it passes**

Run: `npm test -- src/fonts.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/fonts.ts src/fonts.test.ts package.json tsup.config.ts
git commit -m "Add goldenchart/fonts subpath with fontFaceFor"
```

---

## Task 3: Headless auto-embed in `renderToString.ts`

The headless renderer detects which bundled families the SVG references and splices one `<style>` of `@font-face` rules right after the opening `<svg>` tag. Deterministic (deduped, sorted). Handles the `&quot;` entity gotcha.

**Files:**
- Modify: `src/render/renderToString.ts`
- Test: `src/render/renderToString.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

```ts
// src/render/renderToString.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from '../components/BarChart';
import { renderToSVGString } from './renderToString';

const data = [{ label: 'a', value: 3 }, { label: 'b', value: 6 }];
const render = (vibe: unknown) =>
  renderToSVGString(createElement(BarChart, { width: 200, height: 140, vibe, data, bare: true } as any));

describe('renderToSVGString headless font embedding', () => {
  it('embeds the @font-face for a single-quoted family vibe', () => {
    const svg = render('clean_blueprint'); // IBM Plex Sans (bundled)
    expect(svg).toContain('@font-face');
    expect(svg).toContain("font-family:'IBM Plex Sans'");
    expect(svg).toContain('data:font/ttf;base64,');
  });

  it('decodes &quot; entities so double-quoted families still match', () => {
    const svg = render('messy_sketch'); // '"Comic Neue", ...' → escaped to &quot; in markup
    expect(svg).toContain("font-family:'Comic Neue'");
  });

  it('embeds each bundled family at most once and keeps a single <svg> root', () => {
    const svg = render('clean_blueprint');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/@font-face/g)?.length).toBe(1);
  });

  it('omits @font-face when the vibe uses a non-bundled family', () => {
    const svg = render({ preset: 'pencil', fontFamily: 'Arial, sans-serif' });
    expect(svg).not.toContain('@font-face');
    expect(svg).toContain('font-family'); // CSS reference still present
  });
});
```

- [ ] **Step 2: Run them, verify they fail**

Run: `npm test -- src/render/renderToString.test.ts`
Expected: FAIL — current renderer does no embedding. (The first test may pass for the wrong reason while Surface still embeds, until Task 4; the entity-decode and omit tests are what drive this task.)

- [ ] **Step 3: Implement auto-embed**

Replace `src/render/renderToString.ts` with:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { bundledFontFor, fontFaceCss } from '../assets/fonts';

const FONT_FAMILY_ATTR = /font-family="([^"]*)"/g;

/** Decode the HTML entities `renderToStaticMarkup` puts in attribute values. */
function decodeEntities(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
}

/**
 * Build a single deduped, sorted `<style>` of `@font-face` rules for every
 * bundled family the markup references. Sorted by family for deterministic
 * output (stable snapshots). Returns '' when no bundled family is used.
 */
function embeddedFontFaces(markup: string): string {
  const byFamily = new Map<string, string>();
  for (const match of markup.matchAll(FONT_FAMILY_ATTR)) {
    const font = bundledFontFor(decodeEntities(match[1]));
    if (font && !byFamily.has(font.family)) byFamily.set(font.family, fontFaceCss(font));
  }
  if (byFamily.size === 0) return '';
  const rules = [...byFamily.keys()].sort().map((f) => byFamily.get(f)!).join('');
  return `<style>${rules}</style>`;
}

/**
 * Render a GoldenChart element to a standalone SVG string — no DOM, no browser.
 * This is the seam the MCP server and any server-side export build on. The
 * vibe's font is embedded as `@font-face` so the SVG renders identically in a
 * headless rasterizer with no installed/network fonts.
 *
 * The element must render a bare `<svg>` root (pass `bare` to the chart or
 * `Surface`); otherwise the Tailwind wrapper `<div>` leaks into the output.
 */
export function renderToSVGString(element: ReactElement): string {
  const markup = renderToStaticMarkup(element);
  if (!markup.startsWith('<svg')) {
    throw new Error(
      'renderToSVGString expected a bare <svg> root. Pass `bare` to the chart or Surface.',
    );
  }
  const fonts = embeddedFontFaces(markup);
  if (!fonts) return markup;
  const tagEnd = markup.indexOf('>') + 1; // end of the opening <svg ...> tag
  return markup.slice(0, tagEnd) + fonts + markup.slice(tagEnd);
}
```

- [ ] **Step 4: Run them, verify they pass**

Run: `npm test -- src/render/renderToString.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
git add src/render/renderToString.ts src/render/renderToString.test.ts
git commit -m "Embed fonts on the headless render path via font-family auto-detection"
```

---

## Task 4: Strip embedding from the browser entry + fix downstream importers

Now remove the two causes of the bloat, and repoint every consumer that imported font symbols from the main entry.

**Files:**
- Modify: `src/components/Surface.tsx`, `src/index.ts`
- Modify: `mcp/src/exportTools.ts`, `mcp/scripts/compare-agent-surface.mjs`, `mcp/scripts/generate-assets.mjs`
- Test: `src/components/Surface.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/components/Surface.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Surface } from './Surface';
import { RoughText } from '../primitives/RoughText';

const bare = (vibe: unknown) =>
  renderToStaticMarkup(
    createElement(Surface, { width: 100, height: 100, vibe, bare: true } as any,
      createElement(RoughText, { x: 10, y: 10, children: 'hi' } as any)),
  );

describe('Surface', () => {
  it('does not embed @font-face (CSS-only by default)', () => {
    expect(bare('messy_sketch')).not.toContain('@font-face');
  });

  it('still references the vibe font-family', () => {
    expect(bare('messy_sketch')).toContain('font-family');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- src/components/Surface.test.ts`
Expected: FAIL on the first assertion — Surface still embeds `@font-face`.

- [ ] **Step 3: Remove embedding from `Surface.tsx`**

- Delete the import on line 6 (`bundledFontFor` from `../assets/fonts`).
- Delete the font computation block: the comment plus the `const font = ...` and `const fontFace = ...` statements (currently lines 93–99).
- Delete the JSX node on line 115 that conditionally renders the `fontFace` inline `<style>` (the `{fontFace ? ... : null}` expression).
- Leave the draw-on `<style>` node (line 116) and everything else unchanged.

After editing, `src/assets/fonts` must no longer be imported anywhere reachable from `src/index.ts`. Confirm with: `grep -rn "assets/fonts" src/components src/index.ts` → no matches.

- [ ] **Step 4: Remove the font re-export from `src/index.ts`**

Delete lines 16–18 (the comment + the `export { FONT_TTF_BASE64, bundledFontFor, primaryFamily } from './assets/fonts';`).

- [ ] **Step 5: Run library tests + typecheck, verify green**

Run: `npm test` then `npm run typecheck`
Expected: PASS. (No library test asserted `@font-face` before, so only the new Surface test changes behavior here.)

- [ ] **Step 6: Repoint mcp consumers to `goldenchart/fonts`**

- `mcp/src/exportTools.ts:5`: `import { FONT_TTF_BASE64 } from 'goldenchart/fonts';`
- `mcp/scripts/compare-agent-surface.mjs:25`: move `FONT_TTF_BASE64` out of the `from 'goldenchart'` import and import it from `'goldenchart/fonts'`.
- `mcp/scripts/generate-assets.mjs`: same — repoint its font-symbol import to `'goldenchart/fonts'`.

- [ ] **Step 7: Rebuild root, refresh mcp dep, run mcp typecheck**

Run (repo root): `npm run build`
Then refresh the mcp copy of `goldenchart` (Windows: reinstall with `--install-links` so the fresh `dist/` + new `./fonts` export are picked up), then:
Run: `cd mcp && npm run typecheck`
Expected: PASS — `goldenchart/fonts` resolves; `exportTools.ts` typechecks.

- [ ] **Step 8: Commit**

```bash
git add src/components/Surface.tsx src/components/Surface.test.ts src/index.ts \
        mcp/src/exportTools.ts mcp/scripts/compare-agent-surface.mjs mcp/scripts/generate-assets.mjs
git commit -m "Drop font embedding from the browser entry; repoint consumers to goldenchart/fonts"
```

---

## Task 5: Bundle-size guard

Lock the win: a script that fails if the built browser entry contains font bytes or exceeds the size budget. Wire it into CI after the build.

**Files:**
- Create: `scripts/check-bundle.mjs`
- Modify: `package.json` (script), `.github/workflows/ci.yml`

- [ ] **Step 1: Create the guard script**

```js
// scripts/check-bundle.mjs — fails if the browser entry ships font bytes or
// blows the size budget. Run after `npm run build`.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const FILE = 'dist/index.js';
const BUDGET_KB = 150; // generous ceiling; actual should be far smaller

const code = readFileSync(FILE, 'utf8');
const errors = [];

if (code.includes('data:font/ttf;base64')) {
  errors.push(`${FILE} contains embedded font bytes — fonts leaked into the main entry.`);
}

const gzipKb = gzipSync(readFileSync(FILE)).length / 1024;
if (gzipKb > BUDGET_KB) {
  errors.push(`${FILE} is ${gzipKb.toFixed(0)} KB gzipped, over the ${BUDGET_KB} KB budget.`);
}

if (errors.length) {
  console.error('Bundle guard failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Bundle guard OK: ${FILE} is ${gzipKb.toFixed(0)} KB gzipped, no font bytes.`);
```

- [ ] **Step 2: Add the npm script**

In root `package.json` `scripts`, add:

```json
    "check:bundle": "node scripts/check-bundle.mjs"
```

- [ ] **Step 3: Run it against a fresh build, verify it passes**

Run: `npm run build && npm run check:bundle`
Expected: `Bundle guard OK: dist/index.js is <NN> KB gzipped, no font bytes.` with `<NN>` far below 150 (tens of KB). If it still reports font bytes, Task 4's removals are incomplete — fix before continuing.

- [ ] **Step 4: Wire into CI**

In `.github/workflows/ci.yml`, in the `library` job, add a step right after `- run: npm run build`:

```yaml
      - run: npm run check:bundle
```

- [ ] **Step 5: Commit**

```bash
git add scripts/check-bundle.mjs package.json .github/workflows/ci.yml
git commit -m "Add bundle-size guard to lock fonts out of the browser entry"
```

---

## Task 6: Regenerate MCP snapshots + headless parity + visual compare

Headless output content is unchanged (same fonts embedded) but the `@font-face` `<style>` moved to the top of the SVG, so the 3 snapshot files regenerate. Verify the embed still happens and the render looks identical.

**Files:**
- Modify (regenerate): `mcp/src/__snapshots__/*` via `charts.test.ts`, `diagrams.test.ts`, `extraCharts.test.ts`
- Modify: `mcp/src/charts.test.ts` (add a parity assertion)
- Visual: `comparisons/` baselines + PNGs via `mcp/scripts/compare-agent-surface.mjs`

- [ ] **Step 1: Add a headless-parity assertion to `mcp/src/charts.test.ts`**

Inside the existing `for (const tool of tools)` block (after the "renders standalone SVG" test), add:

```ts
      it('embeds the vibe font for headless rendering', async () => {
        const result = await tool.handler(sample);
        expect(result.content[0].text).toContain('@font-face');
      });
```

- [ ] **Step 2: Rebuild root + refresh mcp dep, then run mcp tests to see the snapshot mismatch**

Run (root): `npm run build` → refresh mcp dep (`--install-links`) → `cd mcp && npm test`
Expected: the 3 snapshot tests FAIL with a diff showing only the `@font-face <style>` moving to just after `<svg ...>`; the new parity test PASSES. Inspect the diff and confirm it is *only* the style relocation (same font family, same `<font-bytes>` placeholder from `vitest.setup.ts`) — not missing or changed content.

- [ ] **Step 3: Regenerate the snapshots**

Run: `cd mcp && npm test -- -u`
Expected: snapshots updated; re-run `cd mcp && npm test` → all PASS.

- [ ] **Step 4: Run the visual comparison (output-affecting change → required)**

Run (root): `npm run build` → `cd mcp && npm run compare`
This rasterizes the SP1/SP2/SP3 scenes through resvg. Because resvg is given the fonts via `fontDir`, the before/after PNGs should look identical (proving no visual regression on the headless path). Open `comparisons/compare-sp1-presets.png`, `compare-sp2-shapes.png`, `compare-sp3-arrow.png` and confirm text renders in the correct vibe fonts. The script also imports `FONT_TTF_BASE64` (now from `goldenchart/fonts`, fixed in Task 4) — confirm it runs without import errors.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/__snapshots__ mcp/src/charts.test.ts comparisons
git commit -m "Regenerate MCP snapshots for relocated @font-face + add headless parity assertion"
```

---

## Task 7: Documentation

**Files:**
- Modify: `README.md`, `mcp/README.md`

- [ ] **Step 1: Update the main README font section**

In `README.md`, in "The Vibe engine" font paragraph (around lines 90–94), revise to state that:
- Headless/server rendering (`goldenchart/server`, the MCP server, PNG export) embeds the vibe's font automatically so output is self-contained.
- Browser rendering emits the `font-family` and relies on the page's webfonts; to embed for self-contained browser SVGs, import from `goldenchart/fonts` and inject the CSS. Add a short example:

```tsx
import { fontFaceFor } from 'goldenchart/fonts';
// inject fontFaceFor('pencil') into a <style> in your document for self-contained output
```

- Keep the `FONT_TTF_BASE64` note for resvg-style rasterizers, but update the import path to `goldenchart/fonts`.

- [ ] **Step 2: Update `mcp/README.md` if it references font embedding or `goldenchart` font imports**

Grep `mcp/README.md` for `FONT_TTF_BASE64` / font references and update the import path / behavior description to match.

- [ ] **Step 3: Verify docs examples + paths correct**

Re-read both edited sections; confirm every import path is `goldenchart/fonts` and matches the `package.json` `exports` key.

- [ ] **Step 4: Commit**

```bash
git add README.md mcp/README.md
git commit -m "Document environment-aware font embedding and the goldenchart/fonts subpath"
```

---

## Final verification (run before opening a PR)

- [ ] Root: `npm run build && npm run check:bundle && npm test && npm run typecheck` — all green; guard reports tens of KB, no font bytes.
- [ ] mcp (after root build + dep refresh): `cd mcp && npm run typecheck && npm test` — all green.
- [ ] `cd mcp && npm run compare` runs clean; comparison PNGs show correct fonts.
- [ ] Spot-check: `import { BarChart } from 'goldenchart'` pulls no font bytes (the guard proves this); `import { fontFaceFor } from 'goldenchart/fonts'` returns the expected `@font-face`.

## Notes / pitfalls

- **Do not** add an `embedFonts` prop to `Surface` — a static fonts import there would re-bloat the main entry. Browser opt-in goes through `goldenchart/fonts` only.
- The entity-decode in Task 3 is load-bearing for any double-quoted family (most cursive/serif presets). If a snapshot shows a *missing* `@font-face` for a preset like `messy_sketch`, the decode regex is the first suspect.
- Always rebuild root `dist/` and refresh the mcp dep before running mcp typecheck/test/compare, or you will debug stale output.
