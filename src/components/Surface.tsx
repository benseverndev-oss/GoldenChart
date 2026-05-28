import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { VibeConfig } from '../types/vibe';
import type { BrandConfig, ResolvedBrandLogo } from '../types/brand';
import type { DataTableModel } from '../types/charts';
import { VibeProvider } from '../vibe/VibeProvider';
import { resolveVibe } from '../vibe/resolveVibe';
import { BrandProvider } from '../brand/BrandProvider';
import { resolveBrand } from '../brand/resolveBrand';
import { PaperTexture } from './PaperTexture';

export type { DataTableModel };

export interface SurfaceProps {
  width: number;
  height: number;
  vibe?: VibeConfig;
  /** Brand identity (palette/colours/font/logo) layered on top of the vibe. */
  brand?: BrandConfig;
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

/**
 * CSS for the draw-on reveal, gated behind `prefers-reduced-motion`. The outline
 * dashes itself on like a pen stroke; fills fade in once the stroke is mostly
 * drawn, so the hatching no longer dashes around and the reveal reads as
 * intentional.
 */
function drawOnCss(durationMs: number): string {
  const fillDelay = Math.round(durationMs * 0.6);
  const fillDuration = Math.round(durationMs * 0.5);
  return (
    `@keyframes gc-draw-on{to{stroke-dashoffset:0}}` +
    `@keyframes gc-fade-in{from{opacity:0}to{opacity:1}}` +
    `@media (prefers-reduced-motion: no-preference){` +
    `.${DRAW_ON_CLASS} .gc-draw-stroke{stroke-dasharray:1;stroke-dashoffset:1;` +
    `animation:gc-draw-on ${durationMs}ms ease forwards}` +
    `.${DRAW_ON_CLASS} .gc-draw-fill{opacity:0;` +
    `animation:gc-fade-in ${fillDuration}ms ease ${fillDelay}ms forwards}}`
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
  brand,
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
  const resolvedBrand = useMemo(() => resolveBrand(brand), [brand]);
  const resolved = resolveVibe(vibe, resolvedBrand.vibeOverrides);
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
      {resolved.background ? (
        <rect x={0} y={0} width={width} height={height} fill={resolved.background} />
      ) : null}
      {resolved.texture === 'paper' ? (
        <PaperTexture
          width={width}
          height={height}
          seed={resolved.seed}
          background={resolved.background}
        />
      ) : null}
      {body}
      {/* Logo sits above the data and outside the draw-on group so it never animates. */}
      {resolvedBrand.logo ? (
        <BrandLogoMark logo={resolvedBrand.logo} surfaceWidth={width} surfaceHeight={height} />
      ) : null}
    </svg>
  );

  return (
    <BrandProvider brand={brand}>
      <VibeProvider vibe={vibe} brandOverrides={resolvedBrand.vibeOverrides}>
        {bare ? (
          svg
        ) : (
          <div className={className} style={style}>
            {svg}
            {dataTable ? <DataTable model={dataTable} /> : null}
          </div>
        )}
      </VibeProvider>
    </BrandProvider>
  );
}

/** Pin the brand logo into a corner, inset by its margin, scaled to fit undistorted. */
function BrandLogoMark({
  logo,
  surfaceWidth,
  surfaceHeight,
}: {
  logo: ResolvedBrandLogo;
  surfaceWidth: number;
  surfaceHeight: number;
}) {
  const x = logo.position.endsWith('right') ? surfaceWidth - logo.width - logo.margin : logo.margin;
  const y = logo.position.startsWith('bottom')
    ? surfaceHeight - logo.height - logo.margin
    : logo.margin;
  return (
    <image
      href={logo.src}
      x={x}
      y={y}
      width={logo.width}
      height={logo.height}
      opacity={logo.opacity}
      preserveAspectRatio="xMidYMid meet"
    />
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
