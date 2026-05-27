// Client-only interactivity entry (`goldenchart/interactive`).
//
// MUST NOT be imported by `src/index.ts` — keeping it off the static browser
// entry is what lets `scripts/check-bundle.mjs` guarantee the core stays small
// and font-free. Phase 0 ships the mark contract (types + parser); later phases
// add <InteractiveChart>, tooltips, selection, and navigation here.
export type { MarkKind, MarkMeta } from './types/interaction';
export { readMark } from './interactive/readMark';
