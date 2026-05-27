# Interactivity Phase 3 (Navigation + Transitions) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add semantic pan/zoom (re-scale + re-sketch, not transform), brush range-selection, animated data transitions, and linked/crossfilter selection — all behind `goldenchart/interactive`, leaving the static core output unchanged.

**Architecture:** Zoom/pan track a `viewDomain` in `<InteractiveChart>` and clone the wrapped chart with `xAxis/yAxis.domain` (the static `AxisFormat.domain` already exists and `resolveDomain` honors it — no new core domain plumbing). Pure math (zoom/brush/transition/link) lives in DOM-free `src/core` modules so it is unit-testable per-file; the interactive layer wires pointer/rAF events to it. Per-mark seeds are index-based, so re-sketching at a new domain does not jitter.

**Tech Stack:** React 18, TypeScript, tsup, vitest (node env; per-file runs — full suite/build offloaded to CI per CLAUDE.md), d3-scale.

**Spec:** [interactivity-phase-3-navigation-transitions](../specs/2026-05-27-interactivity-phase-3-navigation-transitions.md) · **Parent roadmap:** [interactivity-roadmap](../specs/2026-05-27-interactivity-roadmap.md)

**Conventions:** TDD per @superpowers:test-driven-development; verify per @superpowers:verification-before-completion. Run single test files: `npx vitest run <path> --no-coverage`. Branch: `feat/interactivity-phase-3` (off `feat/interactivity-phase-2`).

---

## File Structure

**Create (pure core — DOM-free, easily TDD'd):**
- `src/core/zoom.ts` — `zoomDomain`, `panDomain`, `clampDomain`.
- `src/core/brush.ts` — `pixelToValue`, `marksInPixelRange`.
- `src/core/transition.ts` — `lerp`, `interpolateNumberMap`, easing.
- `src/core/linkSelection.ts` — pure reducer for shared filter state.

**Create (interactive — client-only):**
- `src/interactive/useZoomPan.ts` — wheel/drag → `viewDomain`; returns domain + handlers.
- `src/interactive/Brush.tsx` — sketched brush overlay + drag math.
- `src/interactive/useDataTransition.ts` — rAF tween on data change (reduced-motion aware).
- `src/interactive/LinkedCharts.tsx` — provider + `useLinkGroup` context.

**Modify:**
- `src/interactive/InteractiveChart.tsx` — `zoom`/`pan`/`brush`/`transition`/`linkGroup` props; clone child with view domain; mount Brush overlay.
- `src/interactive.ts` — export the Phase 3 API.

**Static core:** no changes expected beyond confirming `AxisFormat.domain` clipping behavior (Task 2).

---

## Task 1: Zoom/pan domain math (pure)

**Files:** Create `src/core/zoom.ts`; Test `src/core/zoom.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/zoom.test.ts
import { describe, expect, it } from 'vitest';
import { zoomDomain, panDomain, clampDomain } from './zoom';

describe('zoom math', () => {
  it('zoomDomain narrows around a focus fraction (factor < 1 zooms in)', () => {
    // focus at 0.5 (centre) of [0,100], factor 0.5 -> [25,75]
    expect(zoomDomain([0, 100], 0.5, 0.5)).toEqual([25, 75]);
  });
  it('zoomDomain keeps the focus point stationary', () => {
    // focus at 0 (left edge) stays at 0
    expect(zoomDomain([0, 100], 0, 0.5)).toEqual([0, 50]);
  });
  it('panDomain shifts by a data delta', () => {
    expect(panDomain([0, 100], 10)).toEqual([10, 110]);
  });
  it('clampDomain keeps span within bounds and respects minSpan', () => {
    expect(clampDomain([-10, 110], [0, 100], 5)).toEqual([0, 100]);
    expect(clampDomain([40, 42], [0, 100], 10)).toEqual([40, 50]);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/core/zoom.test.ts --no-coverage` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/core/zoom.ts
/** Domain math for semantic zoom/pan. Pure: no DOM, no scales. */
export type Domain = [number, number];

/** Zoom around `focus` (0..1 fraction of the domain). factor<1 zooms in. */
export function zoomDomain([lo, hi]: Domain, focus: number, factor: number): Domain {
  const span = hi - lo;
  const anchor = lo + span * focus;
  return [anchor - (anchor - lo) * factor, anchor + (hi - anchor) * factor];
}

/** Shift the whole domain by a data-space delta. */
export function panDomain([lo, hi]: Domain, deltaData: number): Domain {
  return [lo + deltaData, hi + deltaData];
}

/** Clamp a domain inside `bounds`, enforcing a minimum span. */
export function clampDomain([lo, hi]: Domain, [bLo, bHi]: Domain, minSpan: number): Domain {
  let span = Math.max(minSpan, Math.min(hi - lo, bHi - bLo));
  let nLo = Math.max(bLo, Math.min(lo, bHi - span));
  return [nLo, nLo + span];
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `feat(core): zoom/pan domain math`.

---

## Task 2: Confirm controlled-domain clipping

**Files:** Test `src/components/zoomDomain.test.ts` (+ container `overflow:hidden` if needed)

`AxisFormat.domain` + `resolveDomain` already re-scale to a numeric domain. Verify a narrowed domain re-lays geometry and that marks outside the domain don't corrupt output (NaN/Infinity), matching the existing edge-case suite.

- [ ] **Step 1: Write the test** — render `BarChart`/`LineChart` with `xAxis={{domain:[…]}}` narrower than the data; assert SVG re-lays (a known bar x changes) and contains no `NaN|Infinity`.
- [ ] **Step 2: Run; if overflow marks are a visual problem,** set `overflow: 'hidden'` on the `InteractiveChart` container (Task 6) rather than changing the static core.
- [ ] **Step 3: Commit** — `test: controlled-domain rescale is clean`.

---

## Task 3: Brush range math (pure)

**Files:** Create `src/core/brush.ts`; Test `src/core/brush.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/brush.test.ts
import { describe, expect, it } from 'vitest';
import { pixelToValue, marksInPixelRange } from './brush';

describe('brush math', () => {
  it('pixelToValue inverts a linear pixel range to a domain value', () => {
    // pixels [0,200] map to values [0,100]; pixel 100 -> 50
    expect(pixelToValue(100, [0, 200], [0, 100])).toBe(50);
  });
  it('marksInPixelRange filters marks whose cx falls in the brushed x-range', () => {
    const marks = [
      { key: 'a', cx: 10, cy: 0 },
      { key: 'b', cx: 50, cy: 0 },
      { key: 'c', cx: 90, cy: 0 },
    ];
    expect(marksInPixelRange(marks, [40, 100], 'x').map((m) => m.key)).toEqual(['b', 'c']);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** `pixelToValue(px, [p0,p1], [v0,v1])` (linear invert) and `marksInPixelRange(marks, [lo,hi], axis)` (filter by `cx`/`cy`).
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `feat(core): brush range math`.

---

## Task 4: Transition interpolation (pure)

**Files:** Create `src/core/transition.ts`; Test `src/core/transition.test.ts`

- [ ] **Step 1: Write the failing test** — `lerp(0,10,0.5)===5`; `interpolateNumberMap({a:0},{a:10},0.5)==={a:5}`; easing `easeInOut(0)===0`, `easeInOut(1)===1`.
- [ ] **Step 2: Run fail → Step 3: Implement → Step 4: Run pass.**
- [ ] **Step 5: Commit** — `feat(core): transition interpolation helpers`.

---

## Task 5: Linked selection reducer (pure)

**Files:** Create `src/core/linkSelection.ts`; Test `src/core/linkSelection.test.ts`

- [ ] **Step 1: Write the failing test** — a pure reducer: setting a brush/filter for one chart id updates shared state; clearing removes it; `activeFilter(state)` merges.
- [ ] **Step 2: fail → Step 3: implement → Step 4: pass.**
- [ ] **Step 5: Commit** — `feat(core): linked-selection reducer`.

---

## Task 6: Zoom/pan hook + InteractiveChart integration

**Files:** Create `src/interactive/useZoomPan.ts` (+ test); Modify `src/interactive/InteractiveChart.tsx`

- [ ] **Step 1: Test the hook's reducer surface** — given an initial domain and a wheel delta + focus, it produces the expected clamped domain (delegates to `src/core/zoom`); a pan drag shifts it. Keep the hook's math-bearing parts pure/testable; the listener wiring is thin.
- [ ] **Step 2: Implement `useZoomPan`** — tracks `viewDomain`; returns `{ xAxisDomain, yAxisDomain, onWheel, onPointerDown/Move/Up }`. Wheel → `zoomDomain` at the cursor's plot fraction; drag → `panDomain`; both `clampDomain` to the data extent.
- [ ] **Step 3: Wire into `InteractiveChart`** — add `zoom?: boolean | { axis?: 'x'|'y'|'xy'; min?; max? }` and `pan?: boolean`. When enabled, `cloneElement(children, { xAxis: { ...children.props.xAxis, domain }, yAxis: {...} })` and set container `overflow: 'hidden'`. Keep render-free hover/selection intact.
- [ ] **Step 4: Run the interactive test file + the hook test.**
- [ ] **Step 5: Commit** — `feat(interactive): semantic zoom/pan via cloned view domain`.

---

## Task 7: Brush overlay + onBrush

**Files:** Create `src/interactive/Brush.tsx` (+ test); Modify `InteractiveChart.tsx`

- [ ] **Step 1: Test** the brush rect geometry (drag start/end → normalized rect) and that `onBrush` payload maps pixels→range via `src/core/brush`.
- [ ] **Step 2: Implement** a sketched selection rect (`RoughRectangle` in the overlay svg) + drag handling; emit `onBrush(range | null)`.
- [ ] **Step 3: Wire** `brush?: boolean | { axis?: 'x'|'y' }` + `onBrush` into `InteractiveChart` (mutually-exclusive with pan-drag: brush when `brush` set, else pan).
- [ ] **Step 4: Run tests. Step 5: Commit** — `feat(interactive): sketched brush + onBrush`.

---

## Task 8: Animated data transitions

**Files:** Create `src/interactive/useDataTransition.ts` (+ test); Modify `InteractiveChart.tsx`

- [ ] **Step 1: Test** the transition controller's frame schedule with a fake clock: given `from`/`to` and a duration it yields interpolated values via `src/core/transition`; with `prefers-reduced-motion` it snaps to `to` immediately (mock `matchMedia`).
- [ ] **Step 2: Implement `useDataTransition`** — on `data` identity change, tween scaled mark geometry over `durationMs` with rAF; honor reduced-motion. Reuse the `drawOn` CSS classes where the outline reveal helps.
- [ ] **Step 3: Wire** `transition?: boolean | { durationMs?: number }` into `InteractiveChart`.
- [ ] **Step 4: Run tests. Step 5: Commit** — `feat(interactive): animated data transitions (reduced-motion aware)`.

---

## Task 9: LinkedCharts crossfilter

**Files:** Create `src/interactive/LinkedCharts.tsx` (+ test); Modify `InteractiveChart.tsx`

- [ ] **Step 1: Test** that two `InteractiveChart`s sharing a `linkGroup` publish/subscribe a filter (drive the `src/core/linkSelection` reducer through the provider).
- [ ] **Step 2: Implement** `LinkedCharts` provider + `useLinkGroup`; a brush/selection in one chart publishes a filter the others read (and apply via `SeriesVisibility`/selection).
- [ ] **Step 3: Wire** `linkGroup?: string` into `InteractiveChart`.
- [ ] **Step 4: Run tests. Step 5: Commit** — `feat(interactive): linked crossfilter via LinkedCharts`.

---

## Task 10: Export + verify + PR

- [ ] **Step 1: Export** the Phase 3 API from `src/interactive.ts` (zoom/pan hook, Brush, useDataTransition, LinkedCharts, and the pure helpers worth exposing).
- [ ] **Step 2: Run** all new test files together: `npx vitest run src/core/zoom.test.ts src/core/brush.test.ts src/core/transition.test.ts src/core/linkSelection.test.ts src/interactive --no-coverage`.
- [ ] **Step 3: Confirm static-core stability** — no MCP snapshot churn expected (zoom/brush/transition are client-only; `AxisFormat.domain` is opt-in). CI's `mcp` gate is the proof.
- [ ] **Step 4: Push + open PR** (switch to write account first: `gh auth switch --user benzsevern`). CI runs the full `library` + `mcp` gates.

---

## Acceptance (Phase 3 done when)

- [ ] Wheel-zoom narrows the domain and re-sketches crisp geometry without jitter (seed stability holds).
- [ ] Brushing emits the correct range and (when linked) filters another chart.
- [ ] Data changes animate, snapping under `prefers-reduced-motion`.
- [ ] `goldenchart/interactive` exports the Phase 3 API; static core output unchanged; both bundle guards green; CI green.

## Risks / notes

- **Domain flow** must go through `resolveDomain`/`AxisFormat.domain`, not a bespoke path, so all charts inherit zoom uniformly.
- **Overflow on zoom** — clip via the container (`overflow:hidden`), not a static-core change.
- **Transition cost** — re-sketching every frame is heavy; cap mark count and rAF-batch; consider tweening only outline paths.
- **Seed stability** — index-based seeds keep the wobble stable across zoom/transition frames (verified for Bar/Line/Pie).
- **Heaviest phase** — Tasks 1–6 (zoom) are the core shippable slice; brush/transition/linked (7–9) can land incrementally on the same branch.
