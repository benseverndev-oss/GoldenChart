import { createContext, useContext } from 'react';

export interface SeriesVisibility {
  hidden: ReadonlySet<string>;
  toggle: (series: string) => void;
  /** When true, the Legend renders focusable toggle controls. Off by default so
   *  the static/SSR/MCP render emits no extra interactive attributes. */
  interactive: boolean;
}

/** No-op default: hides nothing, toggles nothing, not interactive. Keeps the
 *  static/SSR/MCP render byte-identical until an interactive provider mounts. */
export const defaultSeriesVisibility: SeriesVisibility = {
  hidden: new Set(),
  toggle: () => {},
  interactive: false,
};

const Ctx = createContext<SeriesVisibility>(defaultSeriesVisibility);
export const SeriesVisibilityProvider = Ctx.Provider;

/** Read by charts and `Legend` in their own body (descendants of the provider
 *  that `InteractiveChart` mounts around the chart). */
export function useSeriesVisibility(): SeriesVisibility {
  return useContext(Ctx);
}
