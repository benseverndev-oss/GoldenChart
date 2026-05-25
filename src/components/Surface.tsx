import type { CSSProperties, ReactNode } from 'react';
import type { VibeConfig } from '../types/vibe';
import type { DataTableModel } from '../types/charts';
import { VibeProvider } from '../vibe/VibeProvider';
import { resolveVibe } from '../vibe/resolveVibe';

export type { DataTableModel };

export interface SurfaceProps {
  width: number;
  height: number;
  vibe?: VibeConfig;
  title?: string;
  /** Longer accessible description, rendered as `<desc>`. */
  description?: string;
  /** Explicit aria-label; falls back to `title`. */
  ariaLabel?: string;
  /** Visually-hidden data table mirroring the chart, for screen readers. */
  dataTable?: DataTableModel;
  /** Tailwind classes for the outer container element. */
  className?: string;
  /** Tailwind classes applied to the inner `<svg>`. */
  svgClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /**
   * Render only the `<svg>` (no Tailwind wrapper `<div>`) with an explicit
   * `xmlns`, producing a standalone, serializable SVG. Used by the headless
   * `renderToSVGString` path and the MCP server.
   */
  bare?: boolean;
}

const DRAW_ON_CLASS = 'gc-draw-on';

/** CSS for the draw-on reveal, gated behind `prefers-reduced-motion`. */
function drawOnCss(durationMs: number): string {
  return (
    `@keyframes gc-draw-on{to{stroke-dashoffset:0}}` +
    `@media (prefers-reduced-motion: no-preference){` +
    `.${DRAW_ON_CLASS} path{stroke-dasharray:1;stroke-dashoffset:1;` +
    `animation:gc-draw-on ${durationMs}ms ease forwards}}`
  );
}

const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * The container every chart renders into: a Tailwind-styled wrapper around a
 * single `<svg>`, with a `VibeProvider` so descendant primitives inherit the
 * aesthetic. Owns accessibility (role/title/desc/aria-label, optional data
 * table) and the optional draw-on reveal animation.
 */
export function Surface({
  width,
  height,
  vibe,
  title,
  description,
  ariaLabel,
  dataTable,
  className = 'inline-block max-w-full overflow-visible',
  svgClassName = 'block h-auto w-full',
  style,
  children,
  bare = false,
}: SurfaceProps) {
  const resolved = resolveVibe(vibe);
  const drawOn = resolved.animate?.drawOn ?? false;
  const duration = resolved.animate?.durationMs ?? 800;

  const body = drawOn ? <g className={DRAW_ON_CLASS}>{children}</g> : children;

  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={bare ? undefined : svgClassName}
      role="img"
      aria-label={ariaLabel ?? title}
    >
      {title ? <title>{title}</title> : null}
      {description ? <desc>{description}</desc> : null}
      {drawOn ? <style dangerouslySetInnerHTML={{ __html: drawOnCss(duration) }} /> : null}
      {body}
    </svg>
  );

  return (
    <VibeProvider vibe={vibe}>
      {bare ? (
        svg
      ) : (
        <div className={className} style={style}>
          {svg}
          {dataTable ? <DataTable model={dataTable} /> : null}
        </div>
      )}
    </VibeProvider>
  );
}

function DataTable({ model }: { model: DataTableModel }) {
  return (
    <table style={SR_ONLY}>
      {model.caption ? <caption>{model.caption}</caption> : null}
      <thead>
        <tr>
          {model.columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
