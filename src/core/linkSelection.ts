/**
 * Pure reducer for cross-chart linked selection. Each source chart contributes a
 * set of selected mark keys; the active filter is their union. No DOM, no React.
 */
export interface LinkState {
  /** Selected keys keyed by source chart id. */
  bySource: Record<string, string[]>;
}

export function emptyLink(): LinkState {
  return { bySource: {} };
}

/** Record (or, with an empty list, clear) a source chart's selected keys. */
export function setFilter(state: LinkState, source: string, keys: string[]): LinkState {
  if (keys.length === 0) return clearFilter(state, source);
  return { bySource: { ...state.bySource, [source]: keys } };
}

/** Drop a source chart's contribution. */
export function clearFilter(state: LinkState, source: string): LinkState {
  if (!(source in state.bySource)) return state;
  const next = { ...state.bySource };
  delete next[source];
  return { bySource: next };
}

/** The merged active filter: union of every source's keys, deduped and sorted. */
export function activeFilter(state: LinkState): string[] {
  const all = new Set<string>();
  for (const keys of Object.values(state.bySource)) for (const k of keys) all.add(k);
  return [...all].sort();
}
