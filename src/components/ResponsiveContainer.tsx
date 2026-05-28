import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface ResponsiveSize {
  width: number;
  height: number;
}

export interface ResponsiveContainerProps {
  /** Render-prop receiving the measured size in pixels. */
  children: (size: ResponsiveSize) => ReactNode;
  /** Width-to-height ratio used to derive `height` from observed width. Default 16/9. */
  aspectRatio?: number;
  /** Lower bound on the emitted width. */
  minWidth?: number;
  /** Lower bound on the emitted height. */
  minHeight?: number;
  /** Upper bound on the emitted height. */
  maxHeight?: number;
  /** Resize debounce in ms. Default 80. */
  debounceMs?: number;
  /**
   * Initial size used during SSR / before the first measurement. When omitted,
   * the container renders nothing until it has measured its parent — which is
   * the safe default but means a one-frame layout shift in the browser.
   */
  defaultSize?: ResponsiveSize;
  className?: string;
  style?: CSSProperties;
}

function clamp(value: number, min?: number, max?: number): number {
  let out = value;
  if (typeof min === 'number') out = Math.max(out, min);
  if (typeof max === 'number') out = Math.min(out, max);
  return out;
}

/**
 * Pure size derivation: takes a parent's observed rect plus the container's
 * `aspectRatio` / clamp options and returns the size that will be passed to
 * the render-prop. Extracted so we can unit-test it without mounting React.
 */
export function computeResponsiveSize(
  rect: { width: number; height: number },
  opts: {
    aspectRatio?: number;
    minWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  } = {},
): ResponsiveSize {
  const { aspectRatio = 16 / 9, minWidth, minHeight, maxHeight } = opts;
  const width = clamp(rect.width, minWidth);
  const derived = width / Math.max(aspectRatio, 0.01);
  const observed = rect.height > 1 ? rect.height : derived;
  const height = clamp(observed, minHeight, maxHeight);
  return { width, height };
}

/**
 * Width-driven render-prop wrapper. Measures its own `<div>` with
 * `ResizeObserver` and hands `{ width, height }` to its child render fn so
 * GoldenChart components — which require explicit pixel dimensions — fill the
 * available width.
 *
 * SSR-safe: when no `defaultSize` is provided the container renders nothing
 * until the first measurement. Pass `defaultSize` to render markup during SSR
 * (it will be replaced by the measured size on hydration).
 */
export function ResponsiveContainer({
  children,
  aspectRatio = 16 / 9,
  minWidth,
  minHeight,
  maxHeight,
  debounceMs = 80,
  defaultSize,
  className,
  style,
}: ResponsiveContainerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ResponsiveSize | null>(defaultSize ?? null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const apply = (rect: { width: number; height: number }) => {
      setSize(computeResponsiveSize(rect, { aspectRatio, minWidth, minHeight, maxHeight }));
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const rect = entry.contentRect;
      if (debounceMs > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => apply(rect), debounceMs);
      } else {
        apply(rect);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [aspectRatio, minWidth, minHeight, maxHeight, debounceMs]);

  return (
    <div ref={ref} className={className} style={{ width: '100%', ...style }}>
      {size ? children(size) : null}
    </div>
  );
}
