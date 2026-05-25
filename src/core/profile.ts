/**
 * Data profiling for the `visualize` pipeline. Pure and DOM-free: inspect an
 * array of records and report each field's type/cardinality plus the dataset's
 * overall shape, so the recommendation engine can reason over structure rather
 * than raw values.
 */

export type FieldType = 'quantitative' | 'categorical' | 'temporal' | 'identifier';

export type DataShape =
  | 'single-series'
  | 'multi-series'
  | 'hierarchy'
  | 'graph'
  | 'matrix'
  | 'flat-records';

export interface FieldProfile {
  name: string;
  type: FieldType;
  cardinality: number;
  min?: number;
  max?: number;
  example: unknown;
}

export interface DataProfile {
  rowCount: number;
  fields: FieldProfile[];
  shape: DataShape;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/;

function isTemporal(values: unknown[]): boolean {
  return values.every(
    (v) => v instanceof Date || (typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))),
  );
}

function isNumeric(values: unknown[]): boolean {
  return values.every((v) => typeof v === 'number' && Number.isFinite(v));
}

const ID_NAME = /(^id$|_id$|^uuid$|^key$|^code$|^slug$)/i;

function profileField(name: string, rows: Record<string, unknown>[]): FieldProfile {
  const values = rows.map((r) => r[name]).filter((v) => v !== undefined && v !== null);
  const unique = new Set(values.map((v) => (v instanceof Date ? v.getTime() : v)));
  const cardinality = unique.size;
  const example = values[0];
  const allUnique = cardinality === values.length && values.length > 1;

  // Numeric columns are measures, unless the field name marks them as an id key.
  if (values.length > 0 && isNumeric(values)) {
    if (ID_NAME.test(name) && allUnique) return { name, type: 'identifier', cardinality, example };
    const nums = values as number[];
    return { name, type: 'quantitative', cardinality, min: Math.min(...nums), max: Math.max(...nums), example };
  }

  if (values.length > 0 && isTemporal(values)) {
    return { name, type: 'temporal', cardinality, example };
  }

  // Strings: identifier only for id-like names or large all-unique columns.
  const type: FieldType = ID_NAME.test(name) || (allUnique && rows.length >= 6) ? 'identifier' : 'categorical';
  return { name, type, cardinality, example };
}

function detectShape(fields: FieldProfile[]): DataShape {
  const names = new Set(fields.map((f) => f.name.toLowerCase()));

  if ((names.has('source') && names.has('target')) || (names.has('from') && names.has('to'))) return 'graph';
  if (names.has('id') && names.has('parent')) return 'hierarchy';

  const quantitative = fields.filter((f) => f.type === 'quantitative');
  const categorical = fields.filter((f) => f.type === 'categorical');
  const temporal = fields.filter((f) => f.type === 'temporal');

  if (categorical.length >= 1 && quantitative.length >= 3) return 'matrix';
  // long-format multi-series: an x dimension + a series dimension + one measure
  if (quantitative.length === 1 && categorical.length + temporal.length >= 2) return 'multi-series';
  if (quantitative.length === 1 && categorical.length + temporal.length === 1) return 'single-series';
  return 'flat-records';
}

export function profileData(data: Record<string, unknown>[]): DataProfile {
  if (data.length === 0) return { rowCount: 0, fields: [], shape: 'flat-records' };

  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        names.push(key);
      }
    }
  }

  const fields = names.map((name) => profileField(name, data));
  return { rowCount: data.length, fields, shape: detectShape(fields) };
}
