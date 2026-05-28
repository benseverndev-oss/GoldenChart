---
title: Brand vs. vibe
description: Two independent layers — vibe controls how the chart is drawn; brand controls the identity (palette, ink, page, font, logo).
---

GoldenChart separates *how* something is drawn (the **vibe** — roughness, hachure, stroke width) from *what* it looks like (the **brand** — colours, font, logo). Either layer is optional. Both can be overridden per-chart.

## Vibe — the aesthetic

A vibe is either a preset name or a preset plus targeted overrides:

```tsx
<BarChart vibe="messy_sketch" data={data} width={400} height={300} />
<BarChart
  vibe={{ preset: 'clean_blueprint', roughness: 2, stroke: '#0f766e' }}
  data={data}
  width={400}
  height={300}
/>
```

Available presets include `messy_sketch`, `clean_blueprint`, `chaotic_notebook`, `pencil`, `marker`, `ink`, `crayon`, `davinci_journal`, `chalkboard`, `neon`, `comic_book`, `terminal`, `watercolor`, `newsprint`, `whiteboard`, `typewriter`, `midnight`, `art_deco`, `manga`, `highlighter`, `kraft`, `synthwave`, `botanical`, `risograph`, `sticky_note`, `amber_crt`.

See the [Vibe gallery](/gallery/vibes/) for side-by-side previews.

## Brand — the identity

A brand recolours the same vibe with your palette without changing the hand-drawn feel:

```tsx
<BarChart
  vibe="pencil"
  brand={{
    palette: ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981'],
    primary: '#0ea5e9',
    ink: '#1f2937',
    page: '#ffffff',
    font: 'Inter',
    logo: { src: '/logo.svg', position: 'bottom-right' },
  }}
  data={data}
  width={400}
  height={300}
/>
```

## Precedence

`resolveVibe(config, brandOverrides?)`:

1. Preset defaults
2. Brand overrides (ink → stroke, primary → fill, page → background, font → fontFamily)
3. Explicit `vibe` overrides (always win)

## Auto dark mode

Pass a `ThemedBrand` to follow `prefers-color-scheme`:

```tsx
<BrandProvider
  brand={{
    light: { palette: ['#0ea5e9', '#8b5cf6'], ink: '#0f172a', page: '#ffffff' },
    dark:  { palette: ['#38bdf8', '#a78bfa'], ink: '#e2e8f0', page: '#0f172a' },
  }}
>
  <BarChart data={data} width={400} height={300} />
</BrandProvider>
```

Pin a side with `mode: 'light'` / `mode: 'dark'`; omit `mode` to auto-track the OS theme.

See [Dark mode](/recipes/dark-mode/) for the full pattern.
