---
title: Vibe gallery
description: One bar chart, every preset.
---

Every vibe preset translates a semantic name (`messy_sketch`, `chalkboard`, `neon`, …) into concrete Rough.js knobs — `roughness`, `bowing`, `hachureAngle`, `strokeWidth`, plus a bundled font.

For interactive side-by-side previews, see the [live playground](https://benseverndev-oss.github.io/GoldenChart/). Each chart below the playground's vibe selector renders the same data through every preset so you can pick by eye.

## Preset list

`messy_sketch`, `clean_blueprint`, `chaotic_notebook`, `pencil`, `marker`, `ink`, `crayon`, `davinci_journal`, `blueprint_dark`, `chalkboard`, `neon`, `comic_book`, `terminal`, `watercolor`, `newsprint`, `whiteboard`, `typewriter`, `midnight`, `art_deco`, `manga`, `highlighter`, `kraft`, `synthwave`, `botanical`, `risograph`, `sticky_note`, `amber_crt`.

## Overriding a preset

```tsx
<BarChart
  vibe={{ preset: 'pencil', roughness: 2.5, stroke: '#0f766e' }}
  data={data}
  width={400}
  height={300}
/>
```

Any vibe knob the preset sets can be overridden. The brand layer (palette/ink/page/font) layers on top of the vibe — see [Brand vs. vibe](/start/brand-vs-vibe/).

## Paper texture

Matte presets carry a faint paper-grain speckle controlled by `texture: 'paper' | 'paper-subtle' | 'none'`. Several presets (`newsprint`, `kraft`, `davinci_journal`) enable `'paper'` by default.

## Draw-on animation

```tsx
<BarChart vibe={{ preset: 'chaotic_notebook', animate: { drawOn: true } }} ... />
```

Reveals the chart as if hand-drawn. Honours `prefers-reduced-motion`.
