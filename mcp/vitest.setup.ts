import { expect } from 'vitest';

// SVG snapshots embed a vibe's font as a base64 data URI. Keep the snapshots
// readable and reviewable by storing a placeholder instead of the ~tens-of-KB
// of font bytes — the family + @font-face structure is still asserted.
const FONT_DATA = /(data:font\/ttf;base64,)[A-Za-z0-9+/=]+/g;

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && FONT_DATA.test(val),
  serialize: (val, config, indentation, depth, refs, printer) =>
    printer((val as string).replace(FONT_DATA, '$1<font-bytes>'), config, indentation, depth, refs),
});
