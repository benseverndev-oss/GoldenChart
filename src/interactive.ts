// Client-only interactivity entry (`goldenchart/interactive`).
//
// MUST NOT be imported by `src/index.ts` — keeping it off the static browser
// entry is what lets `scripts/check-bundle.mjs` guarantee the core stays small
// and font-free.
//
// Phase 0: the mark contract (types + parser).
// Phase 1: hover + tooltips (<InteractiveChart>, <Tooltip>).
export type { MarkKind, MarkMeta } from './types/interaction';
export { readMark } from './interactive/readMark';

export { InteractiveChart, markFromEvent, enhanceMarks } from './interactive/InteractiveChart';
export type { InteractiveChartProps, HoverState } from './interactive/InteractiveChart';
export { Tooltip } from './interactive/Tooltip';
export type { TooltipProps, TooltipRenderer } from './interactive/Tooltip';
export { defaultTooltipFormat, markAriaLabel } from './interactive/defaultTooltipFormat';
export type { TooltipContent } from './interactive/defaultTooltipFormat';
export { placeTooltip } from './interactive/placeTooltip';
export { hoverCss, HOVER_ATTR, CURRENT_ATTR } from './interactive/hoverStyle';
