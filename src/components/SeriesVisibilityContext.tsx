import { createContext, useContext } from 'react';

export interface SeriesVisibility {
  hidden: ReadonlySet<string>;
  toggle: (series: string) => void;
}

/** No-op default: hides nothing, toggles nothing. Keeps the static/SSR/MCP
 *  render byte-identical until an interactive provider is mounted above a chart. */
export const defaultSeriesVisibility: SeriesVisibility = { hidden: new Set(), toggle: () => {} };

const Ctx = createContext<SeriesVisibility>(defaultSeriesVisibility);
export const SeriesVisibilityProvider = Ctx.Provider;

/** Read by charts and `Legend` in their own body (descendants of the provider
 *  that `InteractiveChart` mounts around the chart). */
export function useSeriesVisibility(): SeriesVisibility {
  return useContext(Ctx);
}
