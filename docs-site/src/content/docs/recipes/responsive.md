---
title: Responsive sizing
description: Fill the parent container with <ResponsiveContainer>, a ResizeObserver-backed render-prop wrapper.
---

GoldenChart components require explicit pixel `width` / `height`. To fill a parent, wrap the chart in `<ResponsiveContainer>`:

```tsx
import { BarChart, ResponsiveContainer } from 'goldenchart';

<ResponsiveContainer aspectRatio={16 / 9} maxHeight={400}>
  {({ width, height }) => (
    <BarChart width={width} height={height} data={data} />
  )}
</ResponsiveContainer>
```

## Options

| Prop | Default | Notes |
|---|---|---|
| `aspectRatio` | `16 / 9` | Used to derive `height` from observed width when the parent doesn't constrain height. |
| `minWidth` | — | Lower bound on the emitted width. |
| `minHeight` / `maxHeight` | — | Clamp the emitted height. |
| `debounceMs` | `80` | Debounce resize callbacks (one frame at 60Hz ≈ 16ms; 80ms feels smooth without churning). |
| `defaultSize` | — | Initial size used during SSR / before the first measurement. Without one, the container renders nothing until measured. |

## SSR

Pass `defaultSize` so the server emits something:

```tsx
<ResponsiveContainer defaultSize={{ width: 800, height: 450 }}>
  {(size) => <BarChart {...size} data={data} />}
</ResponsiveContainer>
```

On hydration the container measures the real width and re-renders.
