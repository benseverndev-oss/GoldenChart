import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { BrandConfig, ResolvedBrand } from '../types/brand';
import { resolveBrand } from './resolveBrand';
import { useResolvedBrand } from './useColorScheme';

const BrandContext = createContext<ResolvedBrand>(resolveBrand());

export interface BrandProviderProps {
  brand?: BrandConfig;
  children: ReactNode;
}

/**
 * Makes a resolved brand (palette + logo) available to descendants. `<Surface>`
 * wraps its subtree in this so custom compositions can read the brand without
 * threading it manually. Mirrors `VibeProvider`. Themed brands follow the OS
 * colour scheme via `useResolvedBrand`.
 */
export function BrandProvider({ brand, children }: BrandProviderProps) {
  const resolved = useResolvedBrand(brand);
  return <BrandContext.Provider value={resolved}>{children}</BrandContext.Provider>;
}

/** Read the ambient resolved brand. */
export function useBrand(): ResolvedBrand {
  return useContext(BrandContext);
}
