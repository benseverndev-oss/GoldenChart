import type { MarkMeta } from '../types/interaction';

/** Stable per-mark key: `${series ?? ''}:${index}` (series disambiguates multi-series). */
export function markKey(mark: Pick<MarkMeta, 'series' | 'index'>): string {
  return `${mark.series ?? ''}:${mark.index}`;
}

/** Pure selection toggle. Single-select replaces (or clears on re-click of the
 *  sole selection); multi-select toggles membership. */
export function toggleSelection(current: ReadonlySet<string>, key: string, multi: boolean): Set<string> {
  if (!multi) return current.has(key) && current.size === 1 ? new Set() : new Set([key]);
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
