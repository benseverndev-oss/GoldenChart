# Interactivity Phase 0 (Foundations) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every chart mark addressable from a future client layer via an inert `data-gc-*` SVG contract, open the gated `goldenchart/interactive` export, and keep the static core byte-stable and `check:bundle`-guarded.

**Architecture:** A DOM-free `markAttrs()` serializes per-mark metadata into `data-gc-*` attributes spread onto the `<g>` that `SketchPaths` already renders for every primitive. A client-only `readMark()` (in the new `goldenchart/interactive` entry) parses them back. No behavior, no tooltips — just structure and plumbing. Charts gain tagging; line/area gain a transparent hit layer.

**Tech Stack:** React 18, TypeScript, tsup (ESM+CJS+dts), vitest (node env; SVG-string assertions via `renderToSVGString`), d3-scale/shape, Rough.js.

**Spec:** [interactivity-phase-0-foundations](../specs/2026-05-27-interactivity-phase-0-foundations.md) · **Parent roadmap:** [interactivity-roadmap](../specs/2026-05-27-interactivity-roadmap.md)

**Conventions to follow:**
- TDD per @superpowers:test-driven-development. Verify per @superpowers:verification-before-completion.
- Run single test files (full `vitest`/`tsc` can OOM locally): `npx vitest run <path>`.
- Work on a dedicated branch/worktree off `main` (e.g. `feat/interactivity-phase-0`), not the docs branch.

---

## File Structure

**Create:**
- `src/types/interaction.ts` — `MarkKind`, `MarkMeta` (shared, DOM-free).
- `src/core/interaction.ts` — `markAttrs(meta)` serializer (DOM-free, core-safe).
- `src/core/interaction.test.ts` — unit tests for `markAttrs`.
- `src/interactive.ts` — gated client barrel (never imported by `src/index.ts`).
- `src/interactive/readMark.ts` — `readMark(el)` parser (client-only).
- `src/interactive/readMark.test.ts` — round-trip + `closest` tests (jsdom).

**Modify:**
- `src/types/primitives.ts` — add `dataAttrs` + pointer handlers to `RoughPrimitiveProps`.
- `src/primitives/SketchPaths.tsx` — spread them onto the root `<g>`.
- `src/primitives/{RoughRectangle,RoughCircle,RoughPath,RoughLine,RoughText}.tsx` — forward the new props to `SketchPaths`.
- `src/components/BarChart.tsx`, `ScatterPlot.tsx`, `PieChart.tsx` — tag discrete marks.
- `src/components/LineChart.tsx`, `AreaChart.tsx` — add transparent tagged hit layer.
- `src/components/<chart>.test.ts` (new tagging assertions, colocated).
- `tsup.config.ts` — add `src/interactive.ts` entry.
- `package.json` — add `./interactive` export.
- `scripts/check-bundle.mjs` — scan both entries with per-entry budgets.

---

## Task 1: Interaction types + `markAttrs` (DOM-free)

**Files:**
- Create: `src/types/interaction.ts`
- Create: `src/core/interaction.ts`
- Test: `src/core/interaction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/interaction.test.ts
import { describe, expect, it } from 'vitest';
import { markAttrs } from './interaction';

describe('markAttrs', () => {
  it('serializes a single-value mark', () => {
    expect(markAttrs({ kind: 'bar', index: 2, label: 'Q3', value: 7, cx: 100, cy: 40 })).toEqual({
      'data-gc-mark': 'bar',
      'data-gc-index': '2',
      'data-gc-label': 'Q3',
      'data-gc-value': '7',
      'data-gc-cx': '100',
      'data-gc-cy': '40',
    });
  });

  it('includes series when present and JSON-encodes multi-value', () => {
    const attrs = markAttrs({ kind: 'point', series: 'revenue', index: 0, value: { x: 1, y: 2 }, cx: 5, cy: 6 });
    expect(attrs['data-gc-series']).toBe('revenue');
    expect(attrs['data-gc-value']).toBe('{"x":1,"y":2}');
    expect(attrs['data-gc-label']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/interaction.test.ts`
Expected: FAIL — cannot find module `./interaction`.

- [ ] **Step 3: Write the types**

```ts
// src/types/interaction.ts
export type MarkKind = 'bar' | 'point' | 'slice' | 'cell' | 'arc' | 'node' | 'edge';

/** Per-mark metadata. `cx`/`cy` are absolute pixel anchors so later phases can
 *  position/snap without scale access. */
export interface MarkMeta {
  kind: MarkKind;
  series?: string;
  index: number;
  label?: string;
  value: number | Record<string, number>;
  cx: number;
  cy: number;
}
```

- [ ] **Step 4: Write the serializer**

```ts
// src/core/interaction.ts
import type { MarkMeta } from '../types/interaction';

/** Serialize MarkMeta to an inert data-* attribute bag for a primitive's <g>.
 *  DOM-free: safe to call from the static (server/MCP) render path. */
export function markAttrs(meta: MarkMeta): Record<string, string> {
  const attrs: Record<string, string> = {
    'data-gc-mark': meta.kind,
    'data-gc-index': String(meta.index),
    'data-gc-cx': String(meta.cx),
    'data-gc-cy': String(meta.cy),
    'data-gc-value': typeof meta.value === 'number' ? String(meta.value) : JSON.stringify(meta.value),
  };
  if (meta.series !== undefined) attrs['data-gc-series'] = meta.series;
  if (meta.label !== undefined) attrs['data-gc-label'] = meta.label;
  return attrs;
}
```

- [ ] **Step 5: Export the type from the types barrel**

Add to `src/types/index.ts` (follow the existing `export * from './…'` style): `export * from './interaction';`

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/core/interaction.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/types/interaction.ts src/core/interaction.ts src/core/interaction.test.ts src/types/index.ts
git commit -m "feat(interaction): MarkMeta types + DOM-free markAttrs serializer"
```

---

## Task 2: `readMark` client parser (round-trip)

**Files:**
- Create: `src/interactive/readMark.ts`
- Test: `src/interactive/readMark.test.ts`

- [ ] **Step 1: Write the failing test** (jsdom for DOM `Element`)

```ts
// src/interactive/readMark.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { markAttrs } from '../core/interaction';
import { readMark } from './readMark';
import type { MarkMeta } from '../types/interaction';

const tag = (meta: MarkMeta) => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  for (const [k, v] of Object.entries(markAttrs(meta))) g.setAttribute(k, v);
  return g;
};

describe('readMark', () => {
  it('round-trips a single-value mark', () => {
    const meta: MarkMeta = { kind: 'bar', index: 1, label: 'Q2', value: 19, cx: 12, cy: 34 };
    expect(readMark(tag(meta))).toEqual(meta);
  });

  it('parses multi-value and resolves via closest() from a child', () => {
    const meta: MarkMeta = { kind: 'point', series: 's1', index: 0, value: { x: 1, y: 2 }, cx: 5, cy: 6 };
    const g = tag(meta);
    const child = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    g.appendChild(child);
    expect(readMark(child)).toEqual(meta);
  });

  it('returns null when untagged', () => {
    expect(readMark(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/interactive/readMark.test.ts`
Expected: FAIL — cannot find module `./readMark`.

- [ ] **Step 3: Implement the parser**

```ts
// src/interactive/readMark.ts
import type { MarkKind, MarkMeta } from '../types/interaction';

/** Parse the nearest data-gc-* tagged ancestor (or self) into MarkMeta.
 *  Client-only: call it on a pointer/focus event target. */
export function readMark(el: Element): MarkMeta | null {
  const host = el.closest('[data-gc-mark]');
  if (!host) return null;
  const get = (n: string) => host.getAttribute(n);
  const raw = get('data-gc-value');
  const value: MarkMeta['value'] = raw == null ? 0 : raw.startsWith('{') ? JSON.parse(raw) : Number(raw);
  const series = get('data-gc-series');
  const label = get('data-gc-label');
  return {
    kind: get('data-gc-mark') as MarkKind,
    index: Number(get('data-gc-index')),
    value,
    cx: Number(get('data-gc-cx')),
    cy: Number(get('data-gc-cy')),
    ...(series != null ? { series } : {}),
    ...(label != null ? { label } : {}),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/interactive/readMark.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/interactive/readMark.ts src/interactive/readMark.test.ts
git commit -m "feat(interaction): readMark parser with closest() resolution"
```

---

## Task 3: Primitive passthrough (`dataAttrs` + pointer handlers)

**Files:**
- Modify: `src/types/primitives.ts`
- Modify: `src/primitives/SketchPaths.tsx`
- Modify: `src/primitives/RoughRectangle.tsx`, `RoughCircle.tsx`, `RoughPath.tsx`, `RoughLine.tsx`, `RoughText.tsx`
- Test: `src/primitives/primitiveAttrs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/primitives/primitiveAttrs.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { RoughRectangle } from './RoughRectangle';
import { renderToSVGString } from '../render/renderToString';

describe('primitive dataAttrs passthrough', () => {
  it('spreads data-* attributes onto the rendered group', () => {
    const svg = renderToSVGString(
      createElement(RoughRectangle, { x: 0, y: 0, width: 10, height: 10, dataAttrs: { 'data-gc-mark': 'bar', 'data-gc-index': '0' } }),
    );
    expect(svg).toContain('data-gc-mark="bar"');
    expect(svg).toContain('data-gc-index="0"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/primitives/primitiveAttrs.test.ts`
Expected: FAIL — `dataAttrs` not in props / not rendered.

- [ ] **Step 3: Extend the shared props type**

In `src/types/primitives.ts`, update the import and `RoughPrimitiveProps`:

```ts
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
// …inside RoughPrimitiveProps, after onClick:
  /** Inert data-* attributes (e.g. from `markAttrs`) spread onto the rendered <g>. */
  dataAttrs?: Record<string, string>;
  onPointerEnter?: (event: PointerEvent<SVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGElement>) => void;
  onPointerLeave?: (event: PointerEvent<SVGElement>) => void;
  onPointerDown?: (event: PointerEvent<SVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGElement>) => void;
```

- [ ] **Step 4: Spread them in `SketchPaths`**

In `src/primitives/SketchPaths.tsx`: add the same fields to `SketchPathsProps` (mirror the type above, using `PointerEvent`), destructure them, and spread onto the `<g>`:

```tsx
  return (
    <g
      className={className}
      style={style}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      {...dataAttrs}
    >
```

- [ ] **Step 5: Forward from each primitive**

For each of `RoughRectangle`, `RoughCircle`, `RoughPath`, `RoughLine`, `RoughText`: add `dataAttrs, onPointerEnter, onPointerMove, onPointerLeave, onPointerDown, onPointerUp` to the destructured props and pass them through to `SketchPaths` (alongside the existing `onClick`). Example for `RoughRectangle.tsx`:

```tsx
export function RoughRectangle({ x, y, width, height, vibe, seed, stroke, fill, className, style, onClick,
  dataAttrs, onPointerEnter, onPointerMove, onPointerLeave, onPointerDown, onPointerUp, children }: RoughRectangleProps) {
  // …unchanged body…
  return (
    <SketchPaths paths={paths} className={className} style={style} onClick={onClick}
      dataAttrs={dataAttrs} onPointerEnter={onPointerEnter} onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      animate={!!resolved.animate?.drawOn} clip={clip}>
      {children}
    </SketchPaths>
  );
}
```

- [ ] **Step 6: Run test + typecheck**

Run: `npx vitest run src/primitives/primitiveAttrs.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/primitives.ts src/primitives/
git commit -m "feat(primitives): forward dataAttrs + pointer handlers to the mark group"
```

---

## Task 4: Tag BarChart marks

**Files:**
- Modify: `src/components/BarChart.tsx`
- Test: `src/components/barInteraction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/barInteraction.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { renderToSVGString } from '../render/renderToString';

describe('BarChart data-gc tagging', () => {
  it('tags each bar with kind/index/label/value', () => {
    const svg = renderToSVGString(
      createElement(BarChart, { width: 240, height: 160, bare: true, data: [{ label: 'Q1', value: 12 }, { label: 'Q2', value: 19 }] } as never),
    );
    expect(svg).toContain('data-gc-mark="bar"');
    expect(svg).toContain('data-gc-label="Q1"');
    expect(svg).toContain('data-gc-value="12"');
    expect(svg).toContain('data-gc-index="1"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/barInteraction.test.ts`
Expected: FAIL — no `data-gc-*` in output.

- [ ] **Step 3: Implement tagging**

In `BarChart.tsx`: import `markAttrs` (`import { markAttrs } from '../core/interaction';`). Extend `LaidBar` with `label: string; value: number; series?: string;` and set them in all three layout branches (single: `label: d.label, value: d.value`; stacked: `label: s.label, value: s.value, series: s.key`; grouped: `label: d.label, value: d.values[key] ?? 0, series: key`). Then in `BarChartBar`:

```tsx
function BarChartBar({ bar, index }: { bar: LaidBar; index: number }) {
  const vibe = useVibeContext();
  return (
    <RoughRectangle
      x={bar.x} y={bar.y} width={bar.width} height={bar.height}
      fill={bar.color ?? vibe.fill}
      seed={vibe.seed + index}
      dataAttrs={markAttrs({ kind: 'bar', series: bar.series, index, label: bar.label, value: bar.value, cx: bar.x + bar.width / 2, cy: bar.y })}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/barInteraction.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BarChart.tsx src/components/barInteraction.test.ts
git commit -m "feat(BarChart): tag bars with data-gc-* marks"
```

---

## Task 5: Tag ScatterPlot points

**Files:**
- Modify: `src/components/ScatterPlot.tsx`
- Test: `src/components/scatterInteraction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/scatterInteraction.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { ScatterPlot } from './ScatterPlot';
import { renderToSVGString } from '../render/renderToString';

describe('ScatterPlot data-gc tagging', () => {
  it('tags each point with kind/index and JSON x/y value', () => {
    const svg = renderToSVGString(
      createElement(ScatterPlot, { width: 240, height: 160, bare: true, data: [{ x: 1, y: 2 }, { x: 3, y: 4, label: 'p2' }] } as never),
    );
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-index="1"');
    expect(svg).toContain('data-gc-label="p2"');
    expect(svg).toMatch(/data-gc-value="\{(&quot;|")x(&quot;|"):3/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scatterInteraction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement tagging**

In `ScatterPlot.tsx`: import `markAttrs`. Add `label`, `dx`, `dy` to each computed point (`{ cx, cy, r, color: d.color, label: d.label, dx: d.x, dy: d.y }`). Update `ScatterDot`'s prop type and pass:

```tsx
dataAttrs={markAttrs({ kind: 'point', index, label: point.label, value: { x: point.dx, y: point.dy }, cx: point.cx, cy: point.cy })}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/scatterInteraction.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScatterPlot.tsx src/components/scatterInteraction.test.ts
git commit -m "feat(ScatterPlot): tag points with data-gc-* marks"
```

---

## Task 6: Tag PieChart slices

**Files:**
- Modify: `src/components/PieChart.tsx`
- Test: `src/components/pieInteraction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/pieInteraction.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { PieChart } from './PieChart';
import { renderToSVGString } from '../render/renderToString';

describe('PieChart data-gc tagging', () => {
  it('tags each slice with kind/label/value', () => {
    const svg = renderToSVGString(
      createElement(PieChart, { width: 200, height: 200, bare: true, data: [{ label: 'A', value: 3 }, { label: 'B', value: 7 }] } as never),
    );
    expect(svg).toContain('data-gc-mark="slice"');
    expect(svg).toContain('data-gc-label="A"');
    expect(svg).toContain('data-gc-value="7"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/pieInteraction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement tagging**

In `PieChart.tsx`: import `markAttrs`. On the slice `RoughPath`, add (note absolute anchor = plot center + centroid):

```tsx
dataAttrs={markAttrs({ kind: 'slice', index: slice.index, label: slice.datum.label, value: slice.datum.value, cx: cx + slice.centroid[0], cy: cy + slice.centroid[1] })}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/pieInteraction.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PieChart.tsx src/components/pieInteraction.test.ts
git commit -m "feat(PieChart): tag slices with data-gc-* marks"
```

---

## Task 7: Line + Area transparent hit layer

**Files:**
- Modify: `src/components/LineChart.tsx`, `src/components/AreaChart.tsx`
- Test: `src/components/lineAreaInteraction.test.ts`

The line/area series is one merged `RoughPath`, so per-datum hit-testing needs an
invisible tagged target per point. Use a raw `<circle fill="transparent">`
(`transparent` is event-receiving; `none` is not).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/lineAreaInteraction.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { renderToSVGString } from '../render/renderToString';

const series = [{ id: 's1', points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] }];

describe('Line/Area hit layer', () => {
  it('LineChart emits transparent tagged hit circles per point', () => {
    const svg = renderToSVGString(createElement(LineChart, { width: 240, height: 160, bare: true, series } as never));
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-series="s1"');
    expect(svg).toContain('fill="transparent"');
  });

  it('AreaChart emits transparent tagged hit circles per point', () => {
    const svg = renderToSVGString(createElement(AreaChart, { width: 240, height: 160, bare: true, series } as never));
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-series="s1"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/lineAreaInteraction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hit layer (LineChart)**

In `LineChart.tsx`: import `markAttrs`. Add `points: s.points` to each `computed` line object. Inside the series `<g>` (after the points block), add:

```tsx
{line.points.map((pt, j) => (
  <circle
    key={`hit-${j}`}
    cx={line.pixels[j].x}
    cy={line.pixels[j].y}
    r={10}
    fill="transparent"
    {...markAttrs({ kind: 'point', series: line.id, index: j, value: { x: pt.x, y: pt.y }, cx: line.pixels[j].x, cy: line.pixels[j].y })}
  />
))}
```

- [ ] **Step 4: Implement the hit layer (AreaChart)**

In `AreaChart.tsx`: import `markAttrs`. Add `points: s.points` and a `pixels` array to each `computed` object (non-stacked: the `pixels` already computed; stacked: the `top` array). Inside each area `<g>`, render the same transparent tagged circles mapping over `pixels`/`points`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/lineAreaInteraction.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/LineChart.tsx src/components/AreaChart.tsx src/components/lineAreaInteraction.test.ts
git commit -m "feat(Line/Area): inert transparent data-gc hit layer per point"
```

---

## Task 8: Gated `goldenchart/interactive` entry

**Files:**
- Create: `src/interactive.ts`
- Modify: `tsup.config.ts`, `package.json`

- [ ] **Step 1: Create the barrel**

```ts
// src/interactive.ts
// Client-only interactivity. MUST NOT be imported by src/index.ts — that keeps
// it out of the static browser bundle (enforced by scripts/check-bundle.mjs).
export type { MarkKind, MarkMeta } from './types/interaction';
export { readMark } from './interactive/readMark';
```

- [ ] **Step 2: Add the tsup entry**

In `tsup.config.ts`, change `entry` to:

```ts
  entry: ['src/index.ts', 'src/server.ts', 'src/fonts.ts', 'src/interactive.ts'],
```

- [ ] **Step 3: Add the package export**

In `package.json` `exports`, after `./fonts`:

```json
    "./interactive": {
      "types": "./dist/interactive.d.ts",
      "import": "./dist/interactive.js",
      "require": "./dist/interactive.cjs"
    }
```

- [ ] **Step 4: Build and verify the entry emits**

Run: `npm run build`
Expected: build succeeds; `dist/interactive.js`, `dist/interactive.cjs`, `dist/interactive.d.ts` exist.

- [ ] **Step 5: Commit**

```bash
git add src/interactive.ts tsup.config.ts package.json
git commit -m "feat: gated goldenchart/interactive export (types + readMark)"
```

---

## Task 9: Extend `check:bundle` for the interactive entry

**Files:**
- Modify: `scripts/check-bundle.mjs`
- Verify: `npm run check:bundle`

- [ ] **Step 1: Refactor to scan multiple entries**

Replace `scripts/check-bundle.mjs` with a version that scans a list of entries, each with its own budget, keeping the existing `dist/index.js` guard intact (75 KB, no fonts) and adding `dist/interactive.js` (40 KB headroom for later phases, no fonts):

```js
// scripts/check-bundle.mjs — fails if a published entry (and its reachable chunk
// graph) ships font bytes or blows its size budget. Run after `npm run build`.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST = 'dist';
const FONT_MARKER = 'data:font/ttf;base64';
const ENTRIES = [
  { file: path.join(DIST, 'index.js'), budgetKb: 75, label: 'browser entry' },
  { file: path.join(DIST, 'interactive.js'), budgetKb: 40, label: 'interactive entry' },
];

const IMPORT_FROM_RE = /(?:import|export)[^'"]*from\s*['"](\.[^'"]+)['"]/g;
const IMPORT_SIDE_RE = /^import\s*['"](\.[^'"]+)['"]/gm;

function reachableFrom(entry) {
  const reachable = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (reachable.has(file)) continue;
    reachable.add(file);
    const src = readFileSync(file, 'utf8');
    const candidates = [
      ...[...src.matchAll(IMPORT_FROM_RE)].map((m) => m[1]),
      ...[...src.matchAll(IMPORT_SIDE_RE)].map((m) => m[1]),
    ];
    for (const spec of candidates) {
      const resolved = path.join(path.dirname(file), spec);
      if (!reachable.has(resolved) && existsSync(resolved)) queue.push(resolved);
    }
  }
  return [...reachable].sort();
}

const errors = [];
for (const { file, budgetKb, label } of ENTRIES) {
  if (!existsSync(file)) {
    errors.push(`${file} not found — run \`npm run build\` first.`);
    continue;
  }
  const files = reachableFrom(file);
  let totalGzip = 0;
  for (const f of files) {
    const buf = readFileSync(f);
    totalGzip += gzipSync(buf).length;
    if (buf.includes(FONT_MARKER)) errors.push(`${f} contains embedded font bytes — fonts leaked into the ${label}.`);
  }
  const gzipKb = totalGzip / 1024;
  if (gzipKb > budgetKb) errors.push(`${label} graph is ${gzipKb.toFixed(0)} KB gzipped, over the ${budgetKb} KB budget.`);
  else console.log(`Bundle guard OK: ${label} (${file}) is ${gzipKb.toFixed(0)} KB gzipped (${files.length} files), no font bytes.`);
}

if (errors.length) {
  console.error('Bundle guard failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
```

- [ ] **Step 2: Run the guard**

Run: `npm run build && npm run check:bundle`
Expected: two `Bundle guard OK` lines; `.` entry size unchanged from before this phase (within noise) and font-free; interactive entry well under 40 KB.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bundle.mjs
git commit -m "build: guard the interactive entry with its own bundle budget"
```

---

## Task 10: Full verification + MCP snapshot refresh

The `data-gc-*` attributes intentionally change rendered SVG, so MCP golden
snapshots must be regenerated (this is expected churn, not a regression).

- [ ] **Step 1: Run the full library test suite**

Run: `npx vitest run` (or push to CI if it OOMs locally — see CLAUDE.md).
Expected: all green, including the new tagging tests. If any root snapshot test changed only by added `data-gc-*` attrs, update it intentionally: `npx vitest run -u`.

- [ ] **Step 2: Typecheck + bundle guard**

Run: `npm run typecheck && npm run build && npm run check:bundle`
Expected: clean; both bundle guards OK.

- [ ] **Step 3: Refresh the MCP copy and snapshots**

Per CLAUDE.md (Windows): rebuild root, force-recopy into mcp, then update snapshots.

```bash
npm run build
rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)
cd mcp && npx vitest run -u    # snapshots now include data-gc-* attrs
```

Review the snapshot diff: it must be attribute-only (added `data-gc-*` + transparent hit circles). Then revert any `.snap` files that changed by line-endings only (autocrlf quirk): `git checkout -- mcp/src/__snapshots__/*.snap` for the unintended ones.

- [ ] **Step 4: Carry-forward before/after render**

Per the project's output-change process: `cd mcp && npm run compare` and attach the render to the PR.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/__snapshots__ -- ':!*line-ending-only*'
git commit -m "test: refresh MCP golden snapshots for inert data-gc-* attributes"
```

- [ ] **Step 6: Open the PR**

Switch to the write-access account first (see memory: `gh auth switch --user benzsevern`), then push the branch and open a PR. CI runs the `library` and `mcp` gates.

---

## Acceptance (Phase 0 done when)

- [ ] `markAttrs` ↔ `readMark` round-trip is unit-tested (incl. multi-value + `closest`).
- [ ] Bar/Scatter/Pie marks carry the full `data-gc-*` set; Line/Area expose a transparent tagged hit layer.
- [ ] `goldenchart/interactive` imports cleanly and re-exports types + `readMark`; nothing interactive is reachable from `dist/index.js`.
- [ ] `npm run check:bundle` passes for both entries; the `.` entry stays font-free and within 75 KB.
- [ ] MCP snapshots regenerated; diff is attribute-only; CI green.

## Notes / risks

- **Snapshot churn** is expected and large but attribute-only — review for accidental coordinate/value drift.
- **`index` semantics**: Phase 0 uses each mark's render-order index; `series` disambiguates multi-series. Phase 2's `MarkKey` = `` `${series ?? ''}:${index}` `` relies on this being unique per mark — confirm uniqueness holds for grouped/stacked bars.
- **Hit-layer radius (10px)** is a starting value; Phase 1 may tune or replace with a Voronoi overlay if dense.
- Do **not** add interaction behavior here — Phase 1 owns `<InteractiveChart>`, tooltips, and hover highlighting.
