import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ResolvedVibe, VibeConfig, VibeOverrides } from '../types/vibe';
import { resolveVibe } from './resolveVibe';
import { VIBE_PRESETS, DEFAULT_VIBE } from './presets';

const VibeContext = createContext<ResolvedVibe>(VIBE_PRESETS[DEFAULT_VIBE]);

export interface VibeProviderProps {
  vibe?: VibeConfig;
  /**
   * Colour/font knobs from a `Brand`, layered under the explicit `vibe` so
   * descendant primitives inherit branded stroke/fill/font. See `resolveVibe`.
   */
  brandOverrides?: Partial<VibeOverrides>;
  children: ReactNode;
}

/**
 * Makes a resolved vibe available to every descendant primitive. Charts wrap
 * their subtree in this so individual `<RoughPath>`s don't each take a vibe.
 */
export function VibeProvider({ vibe, brandOverrides, children }: VibeProviderProps) {
  const resolved = useMemo(() => resolveVibe(vibe, brandOverrides), [vibe, brandOverrides]);
  return <VibeContext.Provider value={resolved}>{children}</VibeContext.Provider>;
}

/** Read the ambient resolved vibe. Used internally by every primitive. */
export function useVibeContext(): ResolvedVibe {
  return useContext(VibeContext);
}

/**
 * Resolve the effective vibe for a primitive: a local `vibe` prop wins over the
 * surrounding context, and an explicit `seed` overrides whatever it resolves to.
 */
export function useResolvedVibe(localVibe?: VibeConfig, seed?: number): ResolvedVibe {
  const contextVibe = useVibeContext();
  return useMemo(() => {
    const base = localVibe === undefined ? contextVibe : resolveVibe(localVibe);
    return seed === undefined ? base : { ...base, seed };
  }, [localVibe, contextVibe, seed]);
}
