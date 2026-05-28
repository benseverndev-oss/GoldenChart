---
title: Export to PNG / SVG
description: Client-side rasterisation, downloads, and clipboard copy via toPng / toSvgString / downloadChart.
---

`goldenchart` ships browser-side export helpers that work against a live `<svg>`. Attach a ref to the chart's `<Surface>` (or its outer container) and pass the `<svg>` to one of the helpers.

## Grabbing the SVG ref

```tsx
import { useRef } from 'react';
import { BarChart, downloadChart } from 'goldenchart';

function ExportableChart({ data }) {
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <>
      <BarChart svgRef={svgRef} width={480} height={300} data={data} />
      <button
        onClick={() =>
          downloadChart(svgRef.current!, { filename: 'sales', format: 'png', scale: 2 })
        }
      >
        Download PNG
      </button>
    </>
  );
}
```

(`svgRef` is available on `Surface` and forwards through every chart that wraps it.)

## API

| Function | Signature | Notes |
|---|---|---|
| `toSvgString(svg)` | `(SVGSVGElement) => string` | XML-serialises the live SVG, ensures `xmlns` is set. No font embedding. |
| `toPng(svg, opts?)` | `(SVGSVGElement, {scale?, width?, height?, background?}) => Promise<Blob>` | Off-DOM `<canvas>` rasterisation. `scale: 2` by default. |
| `downloadChart(svg, opts)` | `(SVGSVGElement, {filename, format, ...}) => Promise<void>` | Triggers an `<a download>` click. |
| `copyToClipboard(svg, format?)` | `(SVGSVGElement, 'svg' \| 'png') => Promise<void>` | Requires HTTPS + user gesture. Uses `ClipboardItem` for PNG. |
| `chartSvgFrom(container)` | `(Element \| null) => SVGSVGElement \| null` | Find the inner `<svg>` from a container ref. |

## Font handling

These helpers don't embed `@font-face`. The browser is already painting the chart, so the rasterised PNG matches what the user sees. For a *standalone* SVG that renders identically without the consumer's CSS-loaded fonts, use `goldenchart/server`'s `renderToSVGString` instead — that path embeds the font bytes.
