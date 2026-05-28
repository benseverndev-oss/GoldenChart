/**
 * Tiny, dependency-free value formatters for axis ticks and labels. Covers the
 * common cases an agent reaches for — fixed decimals, thousands grouping, SI
 * suffixes, currency, percent, and a strftime subset — without pulling in
 * d3-format / d3-time-format.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SI = ['', 'k', 'M', 'B', 'T'];

const pad = (n: number, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0');

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNumber(value: number, spec: string): string {
  // Subset of d3-format: [$][,][.precision][f|s|%]
  const m = /^(\$)?(,)?(?:\.(\d+))?([fs%])?$/.exec(spec);
  if (!m) return String(value);
  const [, currency, comma, precRaw, type] = m;
  const precision = precRaw != null ? Number(precRaw) : type === 's' ? 1 : type === '%' ? 0 : 2;

  let n = value;
  let suffix = '';
  if (type === '%') {
    n = value * 100;
    suffix = '%';
  } else if (type === 's') {
    const tier =
      value === 0 ? 0 : Math.min(SI.length - 1, Math.floor(Math.log10(Math.abs(value)) / 3));
    n = value / 10 ** (tier * 3);
    suffix = SI[tier];
  }

  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(precision);
  const [intPartRaw, frac] = fixed.split('.');
  const intPart = comma ? group(intPartRaw) : intPartRaw;
  const body = frac ? `${intPart}.${frac}` : intPart;
  return `${sign}${currency ?? ''}${body}${suffix}`;
}

function formatDate(value: number, pattern: string): string {
  const d = new Date(value);
  const tokens: Record<string, () => string> = {
    '%Y': () => String(d.getFullYear()),
    '%y': () => pad(d.getFullYear() % 100),
    '%m': () => pad(d.getMonth() + 1),
    '%B': () => MONTHS[d.getMonth()],
    '%b': () => MONTHS[d.getMonth()].slice(0, 3),
    '%d': () => pad(d.getDate()),
    '%H': () => pad(d.getHours()),
    '%M': () => pad(d.getMinutes()),
    '%S': () => pad(d.getSeconds()),
  };
  return pattern.replace(/%[YymBbdHMS]/g, (tok) => tokens[tok]?.() ?? tok);
}

/**
 * Format a value with an optional d3-ish number/date `spec` and a `unit` suffix.
 * A spec containing `%` *with a letter* (e.g. `%b %Y`) is treated as a date
 * pattern; a bare `%` (e.g. `.0%`) is the percent number type.
 */
export function formatValue(value: string | number, spec?: string, unit?: string): string {
  if (spec == null) return unit ? `${value}${unit}` : String(value);
  const n = typeof value === 'number' ? value : Number(value);
  const isDatePattern = /%[YymBbdHMS]/.test(spec);
  let out: string;
  if (isDatePattern) out = formatDate(n, spec);
  else if (Number.isFinite(n)) out = formatNumber(n, spec);
  else out = String(value);
  return unit ? `${out}${unit}` : out;
}
