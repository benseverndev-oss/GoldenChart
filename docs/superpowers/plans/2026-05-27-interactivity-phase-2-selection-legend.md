# Interactivity Phase 2 (Selection + Interactive Legend) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking/tapping a mark selects it (with `onSelect` + controlled/uncontrolled state), the legend toggles series visibility, and line/area/scatter show a crosshair snapped to the nearest datum — built on Phase 1's boundary, keeping the static render unchanged when no interaction is wired.

**Architecture:** Selection extends `<InteractiveChart>` exactly like hover (render-free emphasis via data-attributes + a `<style>` rule). Legend toggling needs the chart to re-render with hidden series dropped, so introduce a tiny **`SeriesVisibility` React context in core** with a no-op default (`{ hidden: empty Set, toggle: noop }`). Charts and the `Legend` read it; `InteractiveChart` provides the real implementation. Because the default hides nothing and toggles nothing, the static/SSR/MCP render is byte-identical until a provider is mounted. Crosshair/snapping reuse Phase 0's baked `data-gc-cx/cy` (pure pixel-distance nearest-point — no `scale.invert`).

**Tech Stack:** React 18 context, TypeScript, tsup, vitest (node; `renderToSVGString` + `Element` stubs, no jsdom/RTL), Rough.js primitives.

**Spec:** [interactivity-phase-2-selection-legend](../specs/2026-05-27-interactivity-phase-2-selection-legend.md) · **Depends on:** Phases 0–1 (merged to `main`).

**Conventions:** TDD (@superpowers:test-driven-development); verify (@superpowers:verification-before-completion). Single-file tests: `npx vitest run <path>`. New *runtime* interactive code under `src/interactive/`, exported only from `src/interactive.ts`. The `SeriesVisibility` context is the one new **core** module charts import — it must carry no interactive/DOM code so `check:bundle` stays green.

---

## File Structure

**Create:**
- `src/core/seriesVisibility.ts` — `markKey()` + pure `toggleSelection()` (DOM-free).
- `src/core/seriesVisibility.test.ts`
- `src/components/SeriesVisibilityContext.tsx` — React context + `useSeriesVisibility()` hook (no-op default). Core-safe (React only).
- `src/interactive/selectStyle.ts` — selection-emphasis CSS + attribute names.
- `src/interactive/selectStyle.test.ts`
- `src/interactive/Crosshair.tsx` — sketched focus line + nearest-point helper.
- `src/interactive/Crosshair.test.ts`

**Modify:**
- `src/interactive/InteractiveChart.tsx` — selection state + click/keyboard; provide `SeriesVisibility`; render crosshair.
- `src/components/Legend.tsx` — optional toggle behavior driven by the context (backward-compatible).
- `src/components/{BarChart,LineChart,AreaChart}.tsx` — filter hidden series via the context before layout.
- `src/interactive.ts` — export the new selection/visibility/crosshair API.

---

## Task 1: MarkKey + selection reducer (pure)

**Files:** Create `src/core/seriesVisibility.ts`, `src/core/seriesVisibility.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/core/seriesVisibility.test.ts
import { describe, expect, it } from 'vitest';
import { markKey, toggleSelection } from './seriesVisibility';

describe('markKey', () => {
  it('combines series + index, blank series for single-series', () => {
    expect(markKey({ kind: 'bar', index: 2, value: 0, cx: 0, cy: 0 })).toBe(':2');
    expect(markKey({ kind: 'point', series: 's1', index: 0, value: 0, cx: 0, cy: 0 })).toBe('s1:0');
  });
});

describe('toggleSelection', () => {
  it('single-select replaces the set', () => {
    expect([...toggleSelection(new Set(['a']), 'b', false)]).toEqual(['b']);
  });
  it('single-select clicking the selected key clears it', () => {
    expect([...toggleSelection(new Set(['b']), 'b', false)]).toEqual([]);
  });
  it('multi-select toggles membership', () => {
    expect([...toggleSelection(new Set(['a']), 'b', true)].sort()).toEqual(['a', 'b']);
    expect([...toggleSelection(new Set(['a', 'b']), 'b', true)]).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
// src/core/seriesVisibility.ts
import type { MarkMeta } from '../types/interaction';

/** Stable per-mark key: `${series ?? ''}:${index}` (series disambiguates multi-series). */
export function markKey(mark: Pick<MarkMeta, 'series' | 'index'>): string {
  return `${mark.series ?? ''}:${mark.index}`;
}

/** Pure selection toggle. Single-select replaces (or clears on re-click); multi toggles membership. */
export function toggleSelection(current: ReadonlySet<string>, key: string, multi: boolean): Set<string> {
  if (!multi) return current.has(key) && current.size === 1 ? new Set() : new Set([key]);
  const next = new Set(current);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
}
```

- [ ] **Step 4: Run → pass.** **Step 5: Commit** — `feat(interaction): markKey + pure selection toggle`.

---

## Task 2: SeriesVisibility context (core, no-op default)

**Files:** Create `src/components/SeriesVisibilityContext.tsx`

- [ ] **Step 1: Failing test** (`src/components/SeriesVisibilityContext.test.ts`) — the default hook returns an empty hidden set and a no-op toggle (so charts render everything unless a provider overrides).

```ts
import { describe, expect, it } from 'vitest';
import { defaultSeriesVisibility } from './SeriesVisibilityContext';

describe('defaultSeriesVisibility', () => {
  it('hides nothing by default', () => {
    expect(defaultSeriesVisibility.hidden.size).toBe(0);
    expect(() => defaultSeriesVisibility.toggle('s1')).not.toThrow();
  });
});
```

- [ ] **Step 2 → 3: Implement**

```tsx
// src/components/SeriesVisibilityContext.tsx
import { createContext, useContext } from 'react';

export interface SeriesVisibility {
  hidden: ReadonlySet<string>;
  toggle: (series: string) => void;
}

export const defaultSeriesVisibility: SeriesVisibility = { hidden: new Set(), toggle: () => {} };

const Ctx = createContext<SeriesVisibility>(defaultSeriesVisibility);
export const SeriesVisibilityProvider = Ctx.Provider;

/** Charts/Legend read this; the no-op default keeps static rendering unchanged. */
export function useSeriesVisibility(): SeriesVisibility {
  return useContext(Ctx);
}
```

- [ ] **Step 4: Run → pass. Step 5: Commit** — `feat(charts): SeriesVisibility context (no-op default)`.

---

## Task 3: Charts filter hidden series

Multi-series charts drop hidden series before layout (so scales recompute). Single-series Bar is unaffected. Gated by the context default = nothing hidden.

**Files:** Modify `BarChart.tsx`, `LineChart.tsx`, `AreaChart.tsx`; tests `*VisibilityFilter.test.ts`.

- [ ] **Step 1: Failing test** (one per chart) — e.g. a grouped BarChart wrapped in a provider with `hidden={new Set(['south'])}` emits no `data-gc-series="south"` marks. Test by rendering inside a `SeriesVisibilityProvider` value via `createElement`.

```ts
// src/components/barVisibilityFilter.test.ts
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { SeriesVisibilityProvider } from './SeriesVisibilityContext';
import { renderToSVGString } from '../render/renderToString';

it('omits hidden series from grouped bars', () => {
  const svg = renderToSVGString(
    createElement(
      SeriesVisibilityProvider,
      { value: { hidden: new Set(['south']), toggle: () => {} } },
      createElement(BarChart, {
        width: 320, height: 200, bare: true, mode: 'grouped',
        data: [{ label: 'Q1', values: { north: 3, south: 5 } }],
      } as never),
    ),
  );
  expect(svg).toContain('data-gc-series="north"');
  expect(svg).not.toContain('data-gc-series="south"');
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** — in each chart, call `const { hidden } = useSeriesVisibility();` and filter the series id list before computing layout. For BarChart grouped/stacked: filter `seriesIds = (seriesKeys ?? seriesKeysOf(multi)).filter((k) => !hidden.has(k))`. For Line/Area: `series.filter((s) => !hidden.has(s.id))`. Thread `hidden` into the layout `useMemo` deps so scales recompute.
  > Note: charts render the chart body (where they call `useSeriesVisibility`) — confirm the hook is read in the component body, not below `Surface`'s providers. The context is provided by `InteractiveChart` which wraps the whole chart, so the chart body is a descendant of the provider. ✓
- [ ] **Step 4: Run → pass (all three charts).** **Step 5: Commit** — `feat(charts): filter hidden series via SeriesVisibility`.

---

## Task 4: Legend toggling

`Legend` becomes optionally interactive: when a real visibility context is present, items are focusable buttons that call `toggle`, and hidden items render dimmed/struck. With the no-op default, render is unchanged.

**Files:** Modify `src/components/Legend.tsx`; test `legendToggle.test.ts`.

- [ ] **Step 1: Failing test** — rendering a `Legend` inside a provider with `hidden={new Set(['B'])}` marks item B as hidden (e.g. `opacity` or `aria-pressed="false"` / `text-decoration`), and the item carries an interactive role only when toggle is non-noop.
- [ ] **Step 2 → 3: Implement** — `const { hidden, toggle } = useSeriesVisibility();` In each item group: set `opacity` reduced when `hidden.has(it.label)`; add `onClick={() => toggle(it.label)}`, `role="button"`, `tabIndex={0}`, `aria-pressed={!hidden.has(it.label)}`, and `onKeyDown` for Enter/Space. (Series key == legend label, matching how charts key series.) Keep the default no-op harmless — items still render; clicking does nothing without a provider.
  > Verify against `src/core/legend.ts` that `it.label` is the series key the chart filters on.
- [ ] **Step 4: Run → pass. Step 5: Commit** — `feat(Legend): series-toggle when a visibility provider is present`.

---

## Task 5: Selection in InteractiveChart

**Files:** Create `src/interactive/selectStyle.ts` (+test); modify `InteractiveChart.tsx`; extend `InteractiveChart.test.ts`.

- [ ] **Step 1: selectStyle test/impl** — mirror `hoverStyle`: `SELECTED_ATTR='data-gc-selected'` on root, `CHOSEN_ATTR='data-gc-chosen'` on chosen marks; `selectCss()` emphasizes chosen marks (e.g. stronger stroke / full opacity even while another is hovered).
- [ ] **Step 2: InteractiveChart props** — add `selectable?`, `selected?`, `defaultSelected?`, `onSelect?`, `multiSelect?` (controlled/uncontrolled per React convention; internal `useState` seeded from `defaultSelected`, overridden by `selected` when provided).
- [ ] **Step 3:** Add `click` + `keydown` (Enter/Space) to the existing delegation. On a hit: compute `markKey(mark)`, `toggleSelection(...)`, reflect chosen keys as `CHOSEN_ATTR` on the matching mark groups + `SELECTED_ATTR` on root (imperative, render-free), fire `onSelect(mark, allSelectedMarks)`. Inject `<style>{selectCss()}</style>`.
- [ ] **Step 4:** Test the pure parts via the reducer (Task 1) + a `markKey` round-trip from a stubbed element. **Step 5: Commit** — `feat(interactive): mark selection + onSelect`.

---

## Task 6: Provide SeriesVisibility from InteractiveChart

**Files:** Modify `src/interactive/InteractiveChart.tsx`.

- [ ] **Step 1:** Add `legendToggle?: boolean` (default true). Hold `hidden` in `useState<Set<string>>`. Provide `<SeriesVisibilityProvider value={{ hidden, toggle }}>` around `children` so the wrapped chart + its legend re-render on toggle.
  > This is the one place a real re-render happens (legend toggle changes `hidden` → chart relayout). Hover/selection stay render-free.
- [ ] **Step 2:** `toggle(series)` flips membership in `hidden` (a real `setState`).
- [ ] **Step 3: Test** — the provider wiring is covered by Task 3/4 chart tests; add a smoke assertion that `InteractiveChart` re-exports nothing that pulls fonts. **Commit** — `feat(interactive): provide SeriesVisibility for legend toggling`.

---

## Task 7: Crosshair + nearest-point snapping

**Files:** Create `src/interactive/Crosshair.tsx` (+test); wire into `InteractiveChart` for line/area/scatter.

- [ ] **Step 1: Pure nearest-point test** — `nearestMark(marks, x, y)` returns the closest by pixel distance over the baked `cx/cy`. Test with plain data (no DOM).
- [ ] **Step 2 → 3:** Implement `nearestMark` + a `Crosshair` overlay (a `RoughLine` at the snapped `cx`). `InteractiveChart` gains `crosshair?: boolean`; when on, collect tagged marks from the svg once, and on move snap to the nearest and render the crosshair in the overlay alongside the tooltip.
- [ ] **Step 4: Run → pass. Step 5: Commit** — `feat(interactive): crosshair + nearest-point snapping`.

---

## Task 8: Exports + full verification

**Files:** Modify `src/interactive.ts`.

- [ ] **Step 1:** Export `markKey`, `toggleSelection`, selection types, `Crosshair`, `selectCss`, and re-export `SeriesVisibility`/`useSeriesVisibility` types for consumers. (The context + hook ship from the core `.` entry since charts use them; re-export the *types* from interactive for convenience.)
- [ ] **Step 2:** `npx vitest run` — all green. `npm run typecheck && npm run build && npm run check:bundle` — core unchanged + font-free; interactive entry within budget (raise deliberately if needed).
- [ ] **Step 3: MCP must be unchanged.** Charts now *read* `useSeriesVisibility`, but the no-op default hides nothing, so static output is identical. Refresh the mcp copy (`npm run build` then re-`--install-links`) and run `cd mcp && npx vitest run` — expect **zero** snapshot updates. If any change, the context default isn't truly inert — fix before proceeding.
- [ ] **Step 4:** Push; open a PR to `main`. CI runs library + mcp.

---

## Acceptance (Phase 2 done when)

- [ ] Clicking a mark selects it (controlled + uncontrolled), persists emphasis, and fires `onSelect`; multi-select works.
- [ ] Clicking a legend item hides/shows that series with a real relayout (scales recompute); keyboard-operable with `aria-pressed`.
- [ ] Crosshair snaps to the nearest point on line/area/scatter.
- [ ] Pure helpers (`markKey`, `toggleSelection`, `nearestMark`, `selectCss`) unit-tested.
- [ ] Static `.` entry unchanged + font-free; **MCP snapshots unchanged** (proves the visibility context default is inert).

## Risks / notes

- **Core touch (the main risk):** charts + `Legend` now read a context. Keep the default a true no-op (empty `hidden`, noop `toggle`) so SSR/MCP output is byte-identical — the MCP zero-diff check in Task 8 is the guardrail.
- **Series key identity:** legend label must equal the series key charts filter on. Verify against `seriesKeysOf` / `colorAt` indexing in `BarChart`, and `s.id` in Line/Area, before wiring toggle.
- **Re-render scope:** only legend toggles cause a chart re-render; hover (Phase 1) and selection (Task 5) stay render-free via imperative attributes.
- **Don't** import `src/interactive/*` into charts/`Legend`/`Surface`/`index.ts`; the context lives in `src/components`, not `src/interactive`.
