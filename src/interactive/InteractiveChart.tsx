import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { readMark } from './readMark';
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
  vibe,
}: InteractiveChartProps) {
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
    },
    [selectable, multiSelect, selected, onSelect, selSig], // selSig: stable signature of selectedKeys
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

  // Reflect the current selection onto the DOM (render-free emphasis).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (selectedKeys.size > 0) svg.setAttribute(SELECTED_ATTR, '');
    else svg.removeAttribute(SELECTED_ATTR);
    svg.querySelectorAll('[data-gc-mark]').forEach((el) => {
      const m = readMark(el);
      if (m && selectedKeys.has(markKey(m))) el.setAttribute(CHOSEN_ATTR, '');
      else el.removeAttribute(CHOSEN_ATTR);
    });
  }, [selSig]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const vbHeight = viewBox ? Number(viewBox.split(/[\s,]+/)[3]) : undefined;
  return (
    <div ref={attach} style={{ position: 'relative', display: 'inline-block' }}>
      <SeriesVisibilityProvider value={visibility}>{children}</SeriesVisibilityProvider>
      {highlight ? <style>{hoverCss()}</style> : null}
      {selectable ? <style>{selectCss()}</style> : null}
      {hover && (tooltip || crosshair) ? (
        <svg
          viewBox={viewBox}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <VibeProvider vibe={vibe}>
            {crosshair && vbHeight !== undefined ? <Crosshair x={hover.x} height={vbHeight} /> : null}
            {tooltip
              ? renderTooltip
                ? renderTooltip(hover.mark)
                : <Tooltip mark={hover.mark} x={hover.x} y={hover.y} />
              : null}
          </VibeProvider>
        </svg>
      ) : null}
    </div>
  );
}
