---
title: Dark mode
description: Pass a ThemedBrand to follow prefers-color-scheme automatically. SSR-safe.
---

A `ThemedBrand` carries a `light` and a `dark` `Brand`; `BrandProvider` (or `useResolvedBrand`) picks the right side based on the OS preference.

```tsx
import { BrandProvider, BarChart } from 'goldenchart';

<BrandProvider
  brand={{
    // `mode` defaults to `'auto'` — follows the OS.
    light: {
      palette: ['#0ea5e9', '#8b5cf6'],
      ink: '#0f172a',
      page: '#ffffff',
    },
    dark: {
      palette: ['#38bdf8', '#a78bfa'],
      ink: '#e2e8f0',
      page: '#0f172a',
    },
  }}
>
  <BarChart width={400} height={300} data={data} />
</BrandProvider>
```

## Pinning a side

```tsx
brand={{ mode: 'light', light: {...}, dark: {...} }}
brand={{ mode: 'dark',  light: {...}, dark: {...} }}
```

## SSR

`useColorScheme()` defaults to `'light'` until a browser is available, then upgrades to the live `prefers-color-scheme` value on hydration. No layout shift if your initial server render uses the light palette.

## Charts that don't wrap in BrandProvider

Charts read `resolveBrand(brand).palette` directly inside their own body (their layout runs above `Surface`'s providers), so a chart that *doesn't* sit under a `BrandProvider` will default a `ThemedBrand` to the light side. To get auto-theming inside a chart's body, swap `resolveBrand(brand)` for `useResolvedBrand(brand)`:

```tsx
import { useResolvedBrand } from 'goldenchart';

const { palette } = useResolvedBrand(brand);
```
