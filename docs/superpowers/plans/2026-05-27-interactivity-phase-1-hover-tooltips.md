# Interactivity Phase 1 (Hover + Tooltips) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hovering or focusing a chart mark reveals a hand-drawn, vibe-aware tooltip and emphasizes that mark — added entirely in the client-only `goldenchart/interactive` entry, with the static SVG render unchanged.

**Architecture:** `<InteractiveChart>` wraps a chart, refs its rendered `<svg>`, and attaches one delegated `pointermove`/`pointerleave` (+ `focusin`/`focusout`) listener. On each event it resolves the hovered mark via `readMark(target)` (Phase 0) and drives an absolutely-positioned overlay holding a sketched `<Tooltip>`. Hover emphasis is render-free: a `<style>` rule keyed on a `data-gc-hover` attribute the boundary toggles imperatively. The chart body never re-renders on hover. Hit-resolution and tooltip placement are extracted as pure functions so they unit-test under jsdom without React Testing Library (which the repo does not use).

**Tech Stack:** React 18, TypeScript, tsup, vitest (node + per-file `// @vitest-environment jsdom`), Rough.js primitives (`RoughRectangle`/`RoughText`).

**Spec:** [interactivity-phase-1-hover-tooltips](../specs/2026-05-27-interactivity-phase-1-hover-tooltips.md) · **Depends on:** Phase 0 (merged or stacked — provides `data-gc-*`, `readMark`, the `goldenchart/interactive` entry).

**Conventions:**
- TDD per @superpowers:test-driven-development; verify per @superpowers:verification-before-completion.
- Run single test files: `npx vitest run <path>` (full suite is heavy).
- All new runtime code lives under `src/interactive/` and is exported only from `src/interactive.ts` — never from `src/index.ts` (the `check:bundle` core guard depends on this).
- No new test dependency: test pure helpers directly; test the React boundary under a jsdom docblock by calling the extracted handler logic directly, avoiding flaky synthetic `PointerEvent`s.

---

## File Structure

**Create (all client-only, under `src/interactive/`):**
- `placeTooltip.ts` — pure tooltip placement + edge-flipping math.
- `placeTooltip.test.ts`
- `Tooltip.tsx` — vibe-aware sketched tooltip (RoughRectangle + RoughText), rendered into an overlay `<svg>`.
- `Tooltip.test.ts`
- `hoverStyle.ts` — the hover-emphasis CSS string + the attribute names (single source of truth).
- `hoverStyle.test.ts`
- `InteractiveChart.tsx` — the client boundary (ref, delegation, overlay, state).
- `InteractiveChart.test.tsx` — jsdom wiring test.
- `defaultTooltipFormat.ts` — `MarkMeta -> { title?, rows }` default formatter.
- `defaultTooltipFormat.test.ts`

**Modify:**
- `src/interactive.ts` — export `InteractiveChart`, `Tooltip`, types (`InteractiveChartProps`, `TooltipRenderer`).
- `scripts/check-bundle.mjs` — bump the interactive-entry budget if needed (the entry now pulls in React + primitives).

---

## Task 1: Default tooltip formatter (pure)

**Files:**
- Create: `src/interactive/defaultTooltipFormat.ts`, `src/interactive/defaultTooltipFormat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/interactive/defaultTooltipFormat.test.ts
import { describe, expect, it } from 'vitest';
import { defaultTooltipFormat } from './defaultTooltipFormat';

describe('defaultTooltipFormat', () => {
  it('uses the label as title and value as a single row', () => {
    expect(defaultTooltipFormat({ kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 0, cy: 0 })).toEqual({
      title: 'Q1',
      rows: [['value', '12']],
    });
  });

  it('expands a multi-value mark into one row per key', () => {
    const out = defaultTooltipFormat({ kind: 'point', series: 's1', index: 2, value: { x: 1, y: 3 }, cx: 0, cy: 0 });
    expect(out.title).toBe('s1');
    expect(out.rows).toEqual([['x', '1'], ['y', '3']]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/interactive/defaultTooltipFormat.test.ts` → FAIL (missing module).

- [ ] **Step 3: Implement**

```ts
// src/interactive/defaultTooltipFormat.ts
import type { MarkMeta } from '../types/interaction';

export interface TooltipContent {
  title?: string;
  rows: [string, string][];
}

/** Default MarkMeta -> tooltip content: label as the title, value(s) as rows. */
export function defaultTooltipFormat(mark: MarkMeta): TooltipContent {
  const title = mark.label ?? mark.series;
  const rows: [string, string][] =
    typeof mark.value === 'number'
      ? [['value', String(mark.value)]]
      : Object.entries(mark.value).map(([k, v]) => [k, String(v)]);
  return title !== undefined ? { title, rows } : { rows };
}
```

- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `feat(interactive): default tooltip formatter`.

---

## Task 2: Tooltip placement math (pure)

Keeps the tooltip inside the chart bounds by flipping/clamping relative to the anchor.

**Files:**
- Create: `src/interactive/placeTooltip.ts`, `src/interactive/placeTooltip.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/interactive/placeTooltip.test.ts
import { describe, expect, it } from 'vitest';
import { placeTooltip } from './placeTooltip';

const bounds = { width: 200, height: 140 };
const size = { width: 60, height: 30 };

describe('placeTooltip', () => {
  it('places below-right of the anchor by default', () => {
    expect(placeTooltip({ x: 20, y: 20 }, size, bounds, 8)).toEqual({ x: 28, y: 28 });
  });

  it('flips left when it would overflow the right edge', () => {
    const p = placeTooltip({ x: 180, y: 20 }, size, bounds, 8);
    expect(p.x).toBe(180 - 8 - 60);
  });

  it('flips above when it would overflow the bottom edge', () => {
    const p = placeTooltip({ x: 20, y: 130 }, size, bounds, 8);
    expect(p.y).toBe(130 - 8 - 30);
  });

  it('clamps to >= 0 when flipping would push it off the near edge', () => {
    const p = placeTooltip({ x: 2, y: 2 }, { width: 60, height: 30 }, bounds, 8);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement**

```ts
// src/interactive/placeTooltip.ts
export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }

/** Position a tooltip box near `anchor`, offset by `gap`, flipping at the right/
 *  bottom edges of `bounds` and clamping so it never leaves the near edges. */
export function placeTooltip(anchor: Point, size: Size, bounds: Size, gap = 8): Point {
  let x = anchor.x + gap;
  let y = anchor.y + gap;
  if (x + size.width > bounds.width) x = anchor.x - gap - size.width;
  if (y + size.height > bounds.height) y = anchor.y - gap - size.height;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
```

- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `feat(interactive): tooltip placement + edge-flipping math`.

---

## Task 3: Hover-emphasis CSS (single source of truth)

**Files:**
- Create: `src/interactive/hoverStyle.ts`, `src/interactive/hoverStyle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/interactive/hoverStyle.test.ts
import { describe, expect, it } from 'vitest';
import { HOVER_ATTR, CURRENT_ATTR, hoverCss } from './hoverStyle';

describe('hoverCss', () => {
  it('dims non-current marks only while a hover is active', () => {
    const css = hoverCss();
    expect(HOVER_ATTR).toBe('data-gc-hover');
    expect(CURRENT_ATTR).toBe('data-gc-current');
    expect(css).toContain(`[${HOVER_ATTR}] [data-gc-mark]:not([${CURRENT_ATTR}])`);
    expect(css).toContain('opacity');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement**

```ts
// src/interactive/hoverStyle.ts
/** Root attribute present only while something is hovered. */
export const HOVER_ATTR = 'data-gc-hover';
/** Marks the currently-hovered mark group so the dim rule can exclude it. */
export const CURRENT_ATTR = 'data-gc-current';

/** Render-free hover emphasis: dim every mark except the current one, but only
 *  while a hover is active. The opacity transition is gated behind
 *  reduced-motion so it stays instant for users who prefer that. */
export function hoverCss(dimOpacity = 0.35): string {
  return (
    `[${HOVER_ATTR}] [data-gc-mark]:not([${CURRENT_ATTR}]){opacity:${dimOpacity}}` +
    `@media (prefers-reduced-motion: no-preference){` +
    `[data-gc-mark]{transition:opacity 120ms ease}}`
  );
}
```

- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `feat(interactive): hover-emphasis CSS + attribute names`.

---

## Task 4: Sketched Tooltip component

**Files:**
- Create: `src/interactive/Tooltip.tsx`, `src/interactive/Tooltip.test.ts`

- [ ] **Step 1: Write the failing test** — render to string, assert it draws a box + the formatted text.

```ts
// src/interactive/Tooltip.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders a group with the title and a value row', () => {
    const markup = renderToStaticMarkup(
      createElement(Tooltip, {
        mark: { kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 40, cy: 20 },
        x: 50,
        y: 30,
      }),
    );
    expect(markup).toContain('Q1');
    expect(markup).toContain('12');
    expect(markup.startsWith('<g')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — uses `RoughRectangle` (sketched frame) + `RoughText` (halo for legibility), sized from the formatted rows. Vibe is inherited from the surrounding `VibeProvider` when the overlay is wrapped in one (see Task 5). Keep sizing as a simple monospace estimate; precise text metrics are a later refinement.

```tsx
// src/interactive/Tooltip.tsx
import type { ReactNode } from 'react';
import type { MarkMeta } from '../types/interaction';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';
import { defaultTooltipFormat, type TooltipContent } from './defaultTooltipFormat';

export type TooltipRenderer = (mark: MarkMeta) => ReactNode;

export interface TooltipProps {
  mark: MarkMeta;
  x: number;
  y: number;
  format?: (mark: MarkMeta) => TooltipContent;
}

const PAD = 6;
const LINE = 14;
const CHAR_W = 7;

export function Tooltip({ mark, x, y, format = defaultTooltipFormat }: TooltipProps) {
  const { title, rows } = format(mark);
  const lines = [...(title ? [title] : []), ...rows.map(([k, v]) => `${k}: ${v}`)];
  const width = PAD * 2 + Math.max(...lines.map((l) => l.length)) * CHAR_W;
  const height = PAD * 2 + lines.length * LINE;
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none" aria-hidden="true">
      <RoughRectangle x={0} y={0} width={width} height={height} />
      {lines.map((line, i) => (
        <RoughText key={i} x={PAD} y={PAD + LINE * (i + 0.7)} anchor="start" baseline="middle">
          {line}
        </RoughText>
      ))}
    </g>
  );
}
```

- [ ] **Step 4: Run to verify it passes.** (Also typecheck: `npx tsc --noEmit`.)
- [ ] **Step 5: Commit** — `feat(interactive): sketched vibe-aware Tooltip`.

---

## Task 5: InteractiveChart boundary

Wraps a single chart element, refs its `<svg>`, delegates pointer/focus events, and
renders the overlay tooltip. Hover emphasis is applied imperatively (no chart re-render).

Design notes (grounded in `Surface.tsx`):
- A non-`bare` chart renders `<div><svg/>…</div>`; a `bare` chart renders `<svg/>`. The boundary wraps the element in its own positioned `<div>` and finds the `<svg>` via a ref callback that runs `querySelector('svg')`.
- The CSS-delivery pattern in this repo is a `<style>` element whose text content is a controlled constant CSS string (see `drawOnCss` in `Surface.tsx`). Reuse that: render `<style>{hoverCss()}</style>` — a single string child renders as text, no `dangerouslySetInnerHTML` needed.
- The overlay is a sibling absolutely-positioned `<svg>` over the chart (matching `viewBox`/size), holding the `<Tooltip>`. To keep the tooltip sketched in the chart's aesthetic, wrap the overlay contents in a `VibeProvider` seeded from an optional `vibe` prop (mirrors the chart's `vibe`).
- Event → state: on `pointermove`, resolve `readMark(e.target)`; on a hit, set `{ mark, x, y }` (anchored at the mark's `cx/cy`), set `HOVER_ATTR` on the svg root and `CURRENT_ATTR` on the hovered mark group (imperative); on `pointerleave`/miss, clear. Fire `onHover`.
- Extract the impure DOM mapping into `markFromEvent(svg, target, clientX, clientY)` so the wiring is unit-testable under jsdom without synthetic PointerEvents.

**Files:**
- Create: `src/interactive/InteractiveChart.tsx`, `src/interactive/InteractiveChart.test.tsx`

- [ ] **Step 1: Write the failing test** for the extracted helper (jsdom).

```tsx
// src/interactive/InteractiveChart.test.tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { markFromEvent } from './InteractiveChart';

function svgWithMark(): { svg: SVGSVGElement; mark: SVGGElement } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 140');
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  for (const [k, v] of Object.entries({
    'data-gc-mark': 'bar', 'data-gc-index': '0', 'data-gc-label': 'Q1',
    'data-gc-value': '12', 'data-gc-cx': '40', 'data-gc-cy': '20',
  })) mark.setAttribute(k, v);
  svg.appendChild(mark);
  document.body.appendChild(svg);
  return { svg, mark };
}

describe('markFromEvent', () => {
  it('returns the mark + svg-space anchor for a tagged target', () => {
    const { svg, mark } = svgWithMark();
    const out = markFromEvent(svg, mark, 0, 0);
    expect(out?.mark.label).toBe('Q1');
    expect(out?.x).toBe(40);
    expect(out?.y).toBe(20);
  });

  it('returns null for an untagged target', () => {
    const { svg } = svgWithMark();
    expect(markFromEvent(svg, svg, 0, 0)).toBeNull();
  });
});
```

> jsdom returns zeroed layout (`getBoundingClientRect`/`getScreenCTM`), so the tooltip anchors at the mark's own `data-gc-cx/cy` rather than the raw cursor. That is the intended behavior (anchor at the mark, stable under jitter) and keeps the test independent of real layout.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** `markFromEvent` + the `InteractiveChart` component.

```tsx
// src/interactive/InteractiveChart.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { readMark } from './readMark';
import type { MarkMeta } from '../types/interaction';
import type { VibeConfig } from '../types/vibe';
import { VibeProvider } from '../vibe/VibeProvider';
import { Tooltip, type TooltipRenderer } from './Tooltip';
import { HOVER_ATTR, CURRENT_ATTR, hoverCss } from './hoverStyle';

export interface InteractiveChartProps {
  children: ReactElement;
  tooltip?: boolean | TooltipRenderer;
  highlight?: boolean;
  onHover?: (mark: MarkMeta | null) => void;
  /** Mirrors the wrapped chart's vibe so the tooltip is sketched to match. */
  vibe?: VibeConfig;
}

export interface HoverState { mark: MarkMeta; x: number; y: number; }

/** Resolve a pointer/focus target into the hovered mark + its anchor in svg
 *  coordinates. Anchors at the mark's own cx/cy so it is stable regardless of
 *  cursor jitter (and testable without layout). */
export function markFromEvent(_svg: SVGSVGElement, target: Element, _clientX: number, _clientY: number): HoverState | null {
  const mark = readMark(target);
  if (!mark) return null;
  return { mark, x: mark.cx, y: mark.cy };
}
```

Then add the component (see the in-code comments for the caveats to resolve during execution):

```tsx
export function InteractiveChart({ children, tooltip = true, highlight = true, onHover, vibe }: InteractiveChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentRef = useRef<Element | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const clear = useCallback(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.removeAttribute(HOVER_ATTR);
      currentRef.current?.removeAttribute(CURRENT_ATTR);
      currentRef.current = null;
    }
    setHover(null);
    onHover?.(null);
  }, [onHover]);

  const onMove = useCallback((e: Event) => {
    const svg = svgRef.current;
    const target = e.target as Element | null;
    if (!svg || !target) return;
    const next = markFromEvent(svg, target, 0, 0);
    if (!next) { clear(); return; }
    if (highlight) {
      svg.setAttribute(HOVER_ATTR, '');
      const group = target.closest('[data-gc-mark]');
      if (group !== currentRef.current) {
        currentRef.current?.removeAttribute(CURRENT_ATTR);
        group?.setAttribute(CURRENT_ATTR, '');
        currentRef.current = group;
      }
    }
    setHover(next);
    onHover?.(next.mark);
  }, [highlight, onHover, clear]);

  const attach = useCallback((node: HTMLDivElement | null) => {
    svgRef.current = (node?.querySelector('svg') as SVGSVGElement | null) ?? null;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', clear);
    svg.addEventListener('focusin', onMove);
    svg.addEventListener('focusout', clear);
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', clear);
      svg.removeEventListener('focusin', onMove);
      svg.removeEventListener('focusout', clear);
    };
  }, [onMove, clear]);

  const viewBox = svgRef.current?.getAttribute('viewBox') ?? undefined;
  const renderTooltip = typeof tooltip === 'function' ? tooltip : undefined;
  return (
    <div ref={attach} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {highlight ? <style>{hoverCss()}</style> : null}
      {tooltip && hover ? (
        <svg viewBox={viewBox} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
          <VibeProvider vibe={vibe}>
            {renderTooltip ? renderTooltip(hover.mark) : <Tooltip mark={hover.mark} x={hover.x} y={hover.y} />}
          </VibeProvider>
        </svg>
      ) : null}
    </div>
  );
}
```

> Caveats to resolve during execution: (a) the overlay `<svg>` `viewBox` is read from the chart svg on attach — if it is `null` on first paint, store it in state from the `attach` callback; (b) `VibeProvider`'s exact prop name (`vibe`) — confirm against `src/vibe/VibeProvider.tsx`; (c) anchoring at `cx/cy` means cursor-follow is deferred (browser-only refinement via `getScreenCTM`).

- [ ] **Step 4: Run the helper test + typecheck.**
- [ ] **Step 5: Commit** — `feat(interactive): InteractiveChart hover boundary + render-free emphasis`.

---

## Task 6: Accessibility — focusable marks + reduced motion

**Files:** Modify `src/interactive/InteractiveChart.tsx`; add cases to `InteractiveChart.test.tsx`.

- [ ] **Step 1: Write the failing test** — after attaching over a tagged svg, each `[data-gc-mark]` gets `tabindex="0"`, `role="img"`, and an `aria-label` derived from the mark, so keyboard focus reaches them and drives `focusin`. Extract an `enhanceMarks(svg)` helper and test it directly under jsdom.

- [ ] **Step 2 → 4:** Implement `enhanceMarks(svg)` (called from `attach`): for each `[data-gc-mark]`, set `tabIndex=0`, `role="img"`, and `aria-label` from `defaultTooltipFormat(readMark(el))` (e.g. `"Q1: value 12"`). `focusin`/`focusout` already share the hover path. Reduced motion is handled in `hoverCss`. The visually-hidden `dataTable` (emitted by charts when `dataTable` is set) remains the screen-reader source of truth — no change needed.

- [ ] **Step 5: Commit** — `feat(interactive): keyboard-focusable marks + aria labels`.

---

## Task 7: Export + bundle budget

**Files:** Modify `src/interactive.ts`, `scripts/check-bundle.mjs`.

- [ ] **Step 1:** Add to `src/interactive.ts`:

```ts
export { InteractiveChart } from './interactive/InteractiveChart';
export type { InteractiveChartProps } from './interactive/InteractiveChart';
export { Tooltip } from './interactive/Tooltip';
export type { TooltipProps, TooltipRenderer } from './interactive/Tooltip';
export { defaultTooltipFormat } from './interactive/defaultTooltipFormat';
export type { TooltipContent } from './interactive/defaultTooltipFormat';
export { placeTooltip } from './interactive/placeTooltip';
```

- [ ] **Step 2:** `npm run build` — confirm `dist/interactive.js` emits and pulls primitives/React.
- [ ] **Step 3:** `npm run check:bundle`. The interactive entry now includes primitive code; if it exceeds the 40 KB budget, raise it deliberately in `ENTRIES` (document the new number in a comment). The **core `.` entry must remain unchanged and font-free** — confirm both guard lines pass.
- [ ] **Step 4: Commit** — `feat(interactive): export InteractiveChart + Tooltip from goldenchart/interactive`.

---

## Task 8: Full verification

- [ ] **Step 1:** `npx vitest run` — all library tests green (existing + new interactive tests).
- [ ] **Step 2:** `npm run typecheck && npm run build && npm run check:bundle` — clean; both budgets pass.
- [ ] **Step 3: MCP — expect NO snapshot change.** `InteractiveChart` is client-only and never used in the static/`bare`/MCP render path, so `cd mcp && npx vitest run` must pass with **zero** snapshot updates. If any snapshot changes, something leaked into the static path — investigate before proceeding.
- [ ] **Step 4:** Commit any test-only adjustments; push and open/update the PR (stacked on Phase 0 until it merges).

---

## Acceptance (Phase 1 done when)

- [ ] Hovering a mark sets hovered state, dims peers (render-free), and surfaces a sketched tooltip with the mark's label/value; `onHover` fires with the mark then `null`.
- [ ] Keyboard focus reaches each mark and drives the same tooltip path; `aria-label`s present; reduced-motion respected.
- [ ] Pure helpers (`placeTooltip`, `defaultTooltipFormat`, `markFromEvent`, `hoverCss`, `enhanceMarks`) are unit-tested.
- [ ] `goldenchart/interactive` exports `InteractiveChart`/`Tooltip`; static `.` entry unchanged and font-free; interactive budget holds (or is deliberately raised).
- [ ] **MCP snapshots unchanged** (proves nothing leaked into the static render).

## Risks / notes

- **jsdom layout is zeroed** — anchor the tooltip at the mark's `data-gc-cx/cy` (not the raw cursor) so behavior is correct and testable without real layout. Cursor-follow is a browser-only later refinement using `getScreenCTM`.
- **Tooltip re-sketch on move** — anchoring at the mark means the tooltip only moves when the hovered mark changes, sidestepping Rough.js thrash for Phase 1.
- **Overlay vibe** — seed a `VibeProvider` from an optional `vibe` prop so the tooltip matches the chart; threading full brand/vibe context from the wrapped child is deferred (YAGNI).
- **Do not** import anything from `src/interactive/*` into `src/index.ts` or `Surface.tsx` — it would break the core bundle guard.
