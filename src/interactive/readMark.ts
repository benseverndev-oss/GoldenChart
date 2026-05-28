import type { MarkKind, MarkMeta } from '../types/interaction';

/**
 * Parse the nearest `data-gc-*` tagged ancestor (or self) into MarkMeta.
 * Client-only: call it on a pointer/focus event target. Returns null when the
 * element is not part of a tagged mark.
 */
export function readMark(el: Element): MarkMeta | null {
  const host = el.closest('[data-gc-mark]');
  if (!host) return null;
  const get = (n: string) => host.getAttribute(n);
  const raw = get('data-gc-value');
  const value: MarkMeta['value'] =
    raw == null ? 0 : raw.startsWith('{') ? JSON.parse(raw) : Number(raw);
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
