import type { MarkMeta } from '../types/interaction';

/**
 * Serialize MarkMeta to an inert `data-*` attribute bag for a primitive's `<g>`.
 * DOM-free, so it is safe to call from the static (server/MCP) render path.
 */
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
