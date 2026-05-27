import { cloneElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { readMark } from './readMark';
import { useZoomPan, chartXExtent } from './useZoomPan';
import type { Domain } from '../core/zoom';
import { Brush } from './Brush';
import { clientToViewBox, brushRect, marksInPixelRange } from '../core/brush';
import { useDataTransition } from './useDataTransition';
import { useLinkGroup } from './LinkedCharts';
import type { MarkMeta } from '../types/interaction';
import type { VibeConfig } from '../types/vibe';
import { VibeProvider } from '../vibe/VibeProvider';
import { SeriesVisibilityProvider, type SeriesVisibility } from '../components/SeriesVisibilityContext';
import { markKey, toggleSelection } from '../core/seriesVisibility';
import { Tooltip, type TooltipRenderer } from './Tooltip';
import { Crosshair } from './Crosshair';
import { markAriaLabel } from './defaultTooltipFormat';
import { HOVER_ATTR, CURRENT_ATTR, hoverCss } from './hoverStyle';
import { SELECTED_ATTR, CHOSEN_ATTR, selectCss } from './selectStyle';

export interface InteractiveChartProps {
  children: ReactElement;
  /** `true` (default) draws the built-in sketched tooltip; a function renders a custom one. */
  tooltip?: boolean | TooltipRenderer;
  /** Dim non-hovered marks while hovering (render-free). Default `true`. */
  highlight?: boolean;
  onHover?: (mark: MarkMeta | null) => void;
  /** Enable click/keyboard selection of marks. Default `false`. */
  selectable?: boolean;
  /** Controlled selection (mark keys). When set, internal state is ignored. */
  selected?: string | string[] | null;
  defaultSelected?: string | string[] | null;
  multiSelect?: boolean;
  onSelect?: (mark: MarkMeta, selectedKeys: string[]) => void;
  /** Make the chart's legend toggle series visibility. Default `true`. */
  legendToggle?: boolean;
  /** Draw a sketched vertical focus line snapped to the hovered mark. Default `false`. */
  crosshair?: boolean;
  /** Wheel-zoom the continuous x-axis (line/area/scatter), re-sketching at the new domain. */
  zoom?: boolean;
  /** Drag to pan the zoomed x-axis. Implies a zoomable chart. Default `false`. */
  pan?: boolean;
  /** Drag a sketched x-range selection; emits the brushed marks. Takes precedence over pan. */
  brush?: boolean;
  onBrush?: (marks: MarkMeta[]) => void;
  /** Animate the chart's data prop when it changes (snaps under reduced-motion). */
  transition?: boolean | { durationMs?: number };
  /** This chart's source id within a surrounding `<LinkedCharts>` group (crossfilter). */
  linkGroup?: string;
  /** Mirrors the wrapped chart's vibe so the tooltip is sketched to match. */
  vibe?: VibeConfig;
}

export interface HoverState {
  mark: MarkMeta;
  x: number;
  y: number;
}

/** Resolve a pointer/focus target into the hovered mark + its anchor in svg
 *  coordinates. Anchors at the mark's own cx/cy so it is stable regardless of
 *  cursor jitter (and testable without layout). */
export function markFromEvent(
  _svg: SVGSVGElement,
  target: Element,
  _clientX: number,
  _clientY: number,
): HoverState | null {
  const mark = readMark(target);
  if (!mark) return null;
  return { mark, x: mark.cx, y: mark.cy };
}

/** Make every tagged mark keyboard-focusable with an accessible label, so the
 *  hover/selection path is reachable without a pointer. Idempotent. */
export function enhanceMarks(svg: SVGSVGElement): void {
  svg.querySelectorAll('[data-gc-mark]').forEach((el) => {
    const mark = readMark(el);
    if (!mark) return;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', markAriaLabel(mark));
  });
}

function toSet(v: string | string[] | null | undefined): Set<string> {
  return new Set(v == null ? [] : Array.isArray(v) ? v : [v]);
}

/**
 * Client-only boundary that makes a wrapped GoldenChart interactive via event
 * delegation on its `<svg>`: hover tooltips + emphasis (Phase 1), click/keyboard
 * selection, and a legend that toggles series visibility (Phase 2). Hover and
 * selection are render-free (imperative attributes); legend toggles re-render the
 * wrapped chart through the SeriesVisibility context.
 */
export function InteractiveChart({
  children,
  tooltip = true,
  highlight = true,
  onHover,
  selectable = false,
  selected,
  defaultSelected,
  multiSelect = false,
  onSelect,
  legendToggle = true,
  crosshair = false,
  zoom = false,
  pan = false,
  brush = false,
  onBrush,
  transition = false,
  linkGroup,
  vibe,
}: InteractiveChartProps) {
  const link = useLinkGroup();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentRef = useRef<Element | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [viewBox, setViewBox] = useState<string | undefined>(undefined);

  const [internalSel, setInternalSel] = useState<Set<string>>(() => toSet(defaultSelected));
  const selectedKeys = selected !== undefined ? toSet(selected) : internalSel;
  const selSig = [...selectedKeys].sort().join('|');

  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((series: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });
  }, []);
  const visibility = useMemo<SeriesVisibility>(
    () => ({ hidden, toggle, interactive: legendToggle }),
    [hidden, toggle, legendToggle],
  );

  // Semantic zoom/pan: track a view domain and re-sketch the chart at it by
  // cloning with a controlled `xAxis.domain` (re-scale, never a CSS transform).
  const zoomBounds = useMemo<Domain | null>(
    () => (zoom ? chartXExtent(children.props as Record<string, unknown>) : null),
    [zoom, children],
  );
  const zp = useZoomPan(zoomBounds, { pan: pan && !brush });

  // Animate the chart's data prop on change (line/area use `series`, others `data`).
  const childProps = children.props as { xAxis?: Record<string, unknown>; data?: unknown; series?: unknown };
  const dataKey: 'series' | 'data' | null = Array.isArray(childProps.series)
    ? 'series'
    : Array.isArray(childProps.data)
      ? 'data'
      : null;
  const transitionOn = !!transition && dataKey != null;
  const durationMs = typeof transition === 'object' ? transition.durationMs ?? 500 : 500;
  const animatedData = useDataTransition(dataKey ? childProps[dataKey] : undefined, durationMs, transitionOn);

  // Re-sketch the wrapped chart with a controlled view domain and/or animated
  // data by cloning it (re-scale, never a transform).
  const overrides: Record<string, unknown> = {};
  if (zp.domain) overrides.xAxis = { ...(childProps.xAxis ?? {}), domain: zp.domain };
  if (transitionOn && dataKey) overrides[dataKey] = animatedData;
  const content = Object.keys(overrides).length
    ? cloneElement(children as ReactElement<Record<string, unknown>>, overrides)
    : children;

  // x-axis brush: track a drag rect in viewBox space; on release, emit the marks
  // whose anchors fall inside it (via the pure marksInPixelRange helper).
  const [brushPx, setBrushPx] = useState<{ a: number; b: number } | null>(null);
  const brushing = useRef(false);

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

  const onMove = useCallback(
    (e: Event) => {
      const svg = svgRef.current;
      const target = e.target as Element | null;
      if (!svg || !target) return;
      const next = markFromEvent(svg, target, 0, 0);
      if (!next) {
        clear();
        return;
      }
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
    },
    [highlight, onHover, clear],
  );

  const activate = useCallback(
    (target: Element | null) => {
      if (!selectable || !target) return;
      const mark = readMark(target);
      if (!mark) return;
      const next = toggleSelection(selectedKeys, markKey(mark), multiSelect);
      if (selected === undefined) setInternalSel(next);
      onSelect?.(mark, [...next]);
      if (linkGroup) link?.publish(linkGroup, [...next]);
    },
    [selectable, multiSelect, selected, onSelect, selSig, linkGroup, link], // selSig: stable signature of selectedKeys
  );

  const onClick = useCallback((e: Event) => activate(e.target as Element | null), [activate]);
  const onKey = useCallback(
    (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== 'Enter' && ke.key !== ' ') return;
      ke.preventDefault?.();
      activate(e.target as Element | null);
    },
    [activate],
  );

  const attach = useCallback((node: HTMLDivElement | null) => {
    const svg = (node?.querySelector('svg') as SVGSVGElement | null) ?? null;
    svgRef.current = svg;
    setViewBox(svg?.getAttribute('viewBox') ?? undefined);
    if (svg) enhanceMarks(svg);
  }, []);

  // Reflect emphasis onto the DOM (render-free): this chart's own selection plus
  // any incoming filter from a surrounding LinkedCharts group (crossfilter).
  const linkSig = linkGroup && link ? link.filter.join('|') : '';
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const emphasized = new Set<string>([...selectedKeys, ...(linkGroup && link ? link.filter : [])]);
    if (emphasized.size > 0) svg.setAttribute(SELECTED_ATTR, '');
    else svg.removeAttribute(SELECTED_ATTR);
    svg.querySelectorAll('[data-gc-mark]').forEach((el) => {
      const m = readMark(el);
      if (m && emphasized.has(markKey(m))) el.setAttribute(CHOSEN_ATTR, '');
      else el.removeAttribute(CHOSEN_ATTR);
    });
  }, [selSig, linkSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom (wheel) + optional pan (drag), attached with passive:false so the
  // wheel can preventDefault. Kept separate from the hover/selection listeners.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !(zoom || pan)) return;
    const wheel = (e: Event) => zp.onWheel(e as unknown as WheelEvent);
    const down = (e: Event) => zp.onPointerDown(e as unknown as PointerEvent);
    const move = (e: Event) => zp.onPointerMove(e as unknown as PointerEvent);
    const up = () => zp.onPointerUp();
    svg.addEventListener('wheel', wheel, { passive: false });
    if (pan && !brush) {
      svg.addEventListener('pointerdown', down);
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointerleave', up);
    }
    return () => {
      svg.removeEventListener('wheel', wheel);
      svg.removeEventListener('pointerdown', down);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', up);
      svg.removeEventListener('pointerleave', up);
    };
  }, [zoom, pan, brush, zp.onWheel, zp.onPointerDown, zp.onPointerMove, zp.onPointerUp]);

  // Brush drag (takes precedence over pan). Coordinates are converted to viewBox
  // space so they compare directly against the marks' baked data-gc anchors.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !brush) return;
    const vb = (viewBox ?? '0 0 0 0').split(/[\s,]+/).map(Number);
    const toVb = (clientX: number) => {
      const r = svg.getBoundingClientRect();
      return clientToViewBox(clientX, r.left, r.width, vb[0] ?? 0, vb[2] ?? 0);
    };
    const down = (e: Event) => {
      brushing.current = true;
      const x = toVb((e as PointerEvent).clientX);
      setBrushPx({ a: x, b: x });
    };
    const move = (e: Event) => {
      if (!brushing.current) return;
      const x = toVb((e as PointerEvent).clientX);
      setBrushPx((p) => (p ? { a: p.a, b: x } : null));
    };
    const up = () => {
      if (!brushing.current) return;
      brushing.current = false;
      setBrushPx((p) => {
        if (p && svgRef.current) {
          const tagged: { meta: MarkMeta; key: string; cx: number; cy: number }[] = [];
          svgRef.current.querySelectorAll('[data-gc-mark]').forEach((el) => {
            const m = readMark(el);
            if (m) tagged.push({ meta: m, key: markKey(m), cx: m.cx, cy: m.cy });
          });
          const hit = marksInPixelRange(tagged, [p.a, p.b], 'x').map((t) => t.meta);
          onBrush?.(hit);
          if (linkGroup) link?.publish(linkGroup, hit.map(markKey));
        }
        return null;
      });
    };
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointerleave', up);
    return () => {
      svg.removeEventListener('pointerdown', down);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', up);
      svg.removeEventListener('pointerleave', up);
    };
  }, [brush, viewBox, onBrush, linkGroup, link]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', clear);
    svg.addEventListener('focusin', onMove);
    svg.addEventListener('focusout', clear);
    svg.addEventListener('click', onClick);
    svg.addEventListener('keydown', onKey);
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', clear);
      svg.removeEventListener('focusin', onMove);
      svg.removeEventListener('focusout', clear);
      svg.removeEventListener('click', onClick);
      svg.removeEventListener('keydown', onKey);
    };
  }, [onMove, clear, onClick, onKey]);

  const renderTooltip = typeof tooltip === 'function' ? tooltip : undefined;
  const vbParts = viewBox ? viewBox.split(/[\s,]+/).map(Number) : undefined;
  const vbWidth = vbParts?.[2];
  const vbHeight = vbParts?.[3];
  // Cursor affordance for the active interaction mode.
  const cursor = brush ? 'crosshair' : pan ? 'grab' : zoom ? 'zoom-in' : undefined;
  const zoomed = (zoom || pan) && zp.domain != null;
  return (
    <div
      ref={attach}
      style={{ position: 'relative', display: 'inline-block', overflow: zoom || pan ? 'hidden' : undefined, cursor }}
    >
      <SeriesVisibilityProvider value={visibility}>{content}</SeriesVisibilityProvider>
      {highlight ? <style>{hoverCss()}</style> : null}
      {selectable || linkGroup ? <style>{selectCss()}</style> : null}
      {selectable ? <style>{`[${HOVER_ATTR}] [data-gc-mark],[data-gc-mark]{cursor:pointer}`}</style> : null}
      {zoomed ? (
        <button
          type="button"
          onClick={() => zp.reset()}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            font: '11px system-ui, sans-serif',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.25)',
            background: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
          }}
        >
          Reset view
        </button>
      ) : null}
      {brush && brushPx && vbHeight !== undefined ? (
        <svg
          viewBox={viewBox}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <VibeProvider vibe={vibe}>
            <Brush start={brushRect(brushPx.a, brushPx.b).start} length={brushRect(brushPx.a, brushPx.b).length} height={vbHeight} />
          </VibeProvider>
        </svg>
      ) : null}
      {hover && (tooltip || crosshair) ? (
        <svg
          viewBox={viewBox}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <VibeProvider vibe={vibe}>
            {crosshair && vbHeight !== undefined ? <Crosshair x={hover.x} height={vbHeight} /> : null}
            {tooltip
              ? renderTooltip
                ? <g transform={`translate(${hover.x}, ${hover.y})`}>{renderTooltip(hover.mark)}</g>
                : vbWidth !== undefined && vbHeight !== undefined
                  ? <Tooltip mark={hover.mark} anchor={{ x: hover.x, y: hover.y }} bounds={{ width: vbWidth, height: vbHeight }} />
                  : null
              : null}
          </VibeProvider>
        </svg>
      ) : null}
    </div>
  );
}
