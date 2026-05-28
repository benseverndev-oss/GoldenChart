import { measureText } from './text';

/**
 * Legend layout. Pure and DOM-free: flow a set of swatch+label items into one or
 * more centred horizontal rows that fit within `availableWidth`, wrapping as
 * needed. Charts use the returned `height` to reserve a band below the plot and
 * render each placed item at its `x,y`. Keeping this separate from the renderer
 * makes the (fiddly) wrapping/centering logic testable on its own.
 */

export interface LegendItem {
  label: string;
  color: string;
}

export interface PlacedLegendItem extends LegendItem {
  /** Left edge of the swatch, relative to the legend block. */
  x: number;
  /** Vertical centre of the row, relative to the legend block. */
  y: number;
}

export interface LegendLayout {
  rows: PlacedLegendItem[];
  width: number;
  height: number;
}

export interface LegendLayoutOptions {
  swatchSize?: number;
  /** Gap between a swatch and its label. */
  swatchGap?: number;
  /** Gap between items in a row. */
  itemGap?: number;
  rowHeight?: number;
  fontSize?: number;
  fontFamily?: string;
}

export function layoutLegend(
  items: LegendItem[],
  availableWidth: number,
  opts: LegendLayoutOptions = {},
): LegendLayout {
  if (items.length === 0) return { rows: [], width: 0, height: 0 };

  const {
    swatchSize = 14,
    swatchGap = 6,
    itemGap = 18,
    rowHeight = 22,
    fontSize = 14,
    fontFamily = 'sans-serif',
  } = opts;
  const itemWidth = (it: LegendItem) =>
    swatchSize + swatchGap + measureText(it.label, fontSize, fontFamily).width;

  // Greedily group items into rows that fit the available width.
  const grouped: LegendItem[][] = [];
  let current: LegendItem[] = [];
  let currentW = 0;
  for (const it of items) {
    const w = itemWidth(it);
    const added = current.length ? itemGap + w : w;
    if (current.length && currentW + added > availableWidth) {
      grouped.push(current);
      current = [];
      currentW = 0;
    }
    current.push(it);
    currentW += current.length === 1 ? w : itemGap + w;
  }
  if (current.length) grouped.push(current);

  // Place each row centred within the available width.
  const rows: PlacedLegendItem[] = [];
  grouped.forEach((row, r) => {
    const widths = row.map(itemWidth);
    const rowW = widths.reduce((a, b) => a + b, 0) + itemGap * (row.length - 1);
    let x = Math.max(0, (availableWidth - rowW) / 2);
    const y = r * rowHeight + rowHeight / 2;
    row.forEach((it, i) => {
      rows.push({ ...it, x, y });
      x += widths[i] + itemGap;
    });
  });

  return { rows, width: availableWidth, height: grouped.length * rowHeight };
}
