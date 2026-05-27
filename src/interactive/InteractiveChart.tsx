import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { readMark } from './readMark';
import type { MarkMeta } from '../types/interaction';
import type { VibeConfig } from '../types/vibe';
import { VibeProvider } from '../vibe/VibeProvider';
import { Tooltip, type TooltipRenderer } from './Tooltip';
import { markAriaLabel } from './defaultTooltipFormat';
import { HOVER_ATTR, CURRENT_ATTR, hoverCss } from './hoverStyle';

export interface InteractiveChartProps {
  children: ReactElement;
  /** `true` (default) draws the built-in sketched tooltip; a function renders a custom one. */
  tooltip?: boolean | TooltipRenderer;
  /** Dim non-hovered marks while hovering (render-free). Default `true`. */
  highlight?: boolean;
  onHover?: (mark: MarkMeta | null) => void;
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
 *  hover path is reachable without a pointer. Idempotent (safe to re-run). */
export function enhanceMarks(svg: SVGSVGElement): void {
  svg.querySelectorAll('[data-gc-mark]').forEach((el) => {
    const mark = readMark(el);
    if (!mark) return;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', markAriaLabel(mark));
  });
}

/**
 * Client-only boundary that makes a wrapped GoldenChart interactive via event
 * delegation on its `<svg>`. The chart body never re-renders on hover — emphasis
 * is applied imperatively and the tooltip lives in a sibling overlay `<svg>`.
 */
export function InteractiveChart({ children, tooltip = true, highlight = true, onHover, vibe }: InteractiveChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentRef = useRef<Element | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [viewBox, setViewBox] = useState<string | undefined>(undefined);

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

  const attach = useCallback((node: HTMLDivElement | null) => {
    const svg = (node?.querySelector('svg') as SVGSVGElement | null) ?? null;
    svgRef.current = svg;
    setViewBox(svg?.getAttribute('viewBox') ?? undefined);
    if (svg) enhanceMarks(svg);
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

  const renderTooltip = typeof tooltip === 'function' ? tooltip : undefined;
  return (
    <div ref={attach} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {highlight ? <style>{hoverCss()}</style> : null}
      {tooltip && hover ? (
        <svg
          viewBox={viewBox}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <VibeProvider vibe={vibe}>
            {renderTooltip ? renderTooltip(hover.mark) : <Tooltip mark={hover.mark} x={hover.x} y={hover.y} />}
          </VibeProvider>
        </svg>
      ) : null}
    </div>
  );
}
