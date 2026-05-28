import { useEffect, useState } from 'react';
import type { BrandConfig, BrandMode, ResolvedBrand } from '../types/brand';
import { isThemedBrand } from '../types/brand';
import { resolveBrand } from './resolveBrand';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function readSystemScheme(defaultScheme: 'light' | 'dark'): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return defaultScheme;
  }
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * Subscribes to the OS colour-scheme preference. SSR-safe: returns
 * `defaultScheme` (default `'light'`) until a browser is available, then
 * resolves to the live `prefers-color-scheme` value.
 */
export function useColorScheme(defaultScheme: 'light' | 'dark' = 'light'): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(defaultScheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MEDIA_QUERY);
    const sync = () => setScheme(mq.matches ? 'dark' : 'light');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return scheme;
}

/**
 * Resolve a brand, honouring a `ThemedBrand`'s `mode`:
 *   `'auto'` (default) — follows `useColorScheme()`
 *   `'light'` / `'dark'` — pinned
 *
 * For plain `Brand`s this is just `resolveBrand(brand)`. Charts that want
 * to follow the OS theme should swap `resolveBrand(brand)` for this hook.
 */
export function useResolvedBrand(brand?: BrandConfig): ResolvedBrand {
  const systemScheme = useColorScheme();
  if (!isThemedBrand(brand)) return resolveBrand(brand);
  const mode: BrandMode = brand.mode ?? 'auto';
  const scheme: 'light' | 'dark' = mode === 'auto' ? systemScheme : mode;
  return resolveBrand(brand, scheme);
}

export { readSystemScheme as __readSystemSchemeForTest };
