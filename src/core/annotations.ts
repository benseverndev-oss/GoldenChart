/**
 * Annotation + emphasis types, kept in the (DOM-free) core so both the renderer
 * (`components/Annotations.tsx`) and the emphasis resolver can share them.
 */

export type Annotation =
  | { kind: 'x-line' | 'y-line'; value: number; label?: string; color?: string }
  | { kind: 'x-band' | 'y-band'; from: number; to: number; label?: string; color?: string }
  | {
      kind: 'point-callout';
      x: number;
      y: number;
      text: string;
      dx?: number;
      dy?: number;
      color?: string;
    }
  | { kind: 'circle'; x: number; y: number; r: number; label?: string; color?: string }
  | {
      kind: 'segment';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label?: string;
      color?: string;
    };

/**
 * Higher-level, data-relative emphasis an agent can ask for. Resolved against
 * the chart's series into concrete annotations (+ per-series highlight state) by
 * `resolveEmphasis`.
 */
export type EmphasisSpec =
  | { kind: 'trend'; series?: string; method?: 'linear' | 'mean'; color?: string }
  | {
      kind: 'auto-callout';
      pick: 'max' | 'min' | 'first' | 'last' | 'peak';
      series?: string;
      template?: string;
      color?: string;
    }
  | { kind: 'highlight-series'; id: string; mode?: 'emphasize' | 'mute-others' };
