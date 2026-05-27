import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { emptyLink, setFilter, activeFilter, type LinkState } from '../core/linkSelection';

export interface LinkGroupValue {
  /** Merged active filter (union of every member chart's published keys). */
  filter: string[];
  /** Publish this chart's selected/brushed keys under its source id. */
  publish: (source: string, keys: string[]) => void;
}

const LinkContext = createContext<LinkGroupValue | null>(null);

/**
 * Wrap a set of `<InteractiveChart linkGroup="...">`s so a brush/selection in one
 * filters the others. Holds the shared selection state via the pure
 * `core/linkSelection` reducer; the active filter is the union across members.
 */
export function LinkedCharts({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LinkState>(emptyLink);
  const publish = useCallback((source: string, keys: string[]) => {
    setState((s) => setFilter(s, source, keys));
  }, []);
  const value = useMemo<LinkGroupValue>(() => ({ filter: activeFilter(state), publish }), [state, publish]);
  return <LinkContext.Provider value={value}>{children}</LinkContext.Provider>;
}

/** Read the surrounding link group, or null when not inside `<LinkedCharts>`. */
export function useLinkGroup(): LinkGroupValue | null {
  return useContext(LinkContext);
}
