---
title: Brands
description: The same chart across brand kits — palette, ink, page, font, and logo layered on a vibe.
---

A **brand** is identity layered on top of a **vibe**. Where the vibe controls _how_ a chart is drawn (texture, roughness), the brand controls _what colours and marks_ it wears: `palette`, `primary`, `ink`, `page`, `font`, and an optional `logo`. Precedence is preset < brand < explicit vibe, so a brand themes a chart without touching its texture.

```tsx
import { BarChart } from 'goldenchart';

const acme = {
  primary: '#0f766e',
  ink: '#134e4a',
  page: '#f0fdfa',
  palette: ['#0f766e', '#f59e0b', '#be123c', '#1d4ed8'],
};

<BarChart width={420} height={280} brand={acme} data={data} />;
```

## Themed brands (auto dark mode)

A `ThemedBrand` is `{ mode?, light, dark }`. `<BrandProvider>` resolves it against `prefers-color-scheme`, so one config gives you both light and dark automatically:

```tsx
const themed = {
  light: { page: '#ffffff', ink: '#111827', palette: ['#2563eb', '#db2777'] },
  dark: { page: '#0b1020', ink: '#e5e7eb', palette: ['#60a5fa', '#f472b6'] },
};

<BrandProvider brand={themed}>
  <BarChart width={420} height={280} data={data} />
</BrandProvider>;
```

## See also

- [Vibes gallery](/gallery/vibes/)
- [Brand vs. vibe](/start/brand-vs-vibe/)
- [Dark mode recipe](/recipes/dark-mode/)
