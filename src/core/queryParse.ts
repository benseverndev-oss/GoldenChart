import type { DataProfile, FieldProfile } from './profile';
import type { ChartType } from './recommend';
import type { VibeConfig } from '../types/vibe';
import { VIBE_PRESETS } from '../vibe/presets';

/**
 * Heuristic, deterministic natural-language → chart hints. Pure and DOM-free:
 * given an English query and a data profile it extracts the intent, an optional
 * chart-type override, field-role assignments, and a vibe — never picks a chart
 * itself, only nudges the recommender (see `planChart`). Never throws.
 */
export interface ChartHints {
  intent?: Intent;
  chartType?: ChartType;
  /** Encoding patch in a neutral role vocabulary: x, y, series, source, target. */
  roles?: Record<string, string>;
  vibe?: VibeConfig;
  /** Extra props implied by the query, e.g. `innerRadius` for "donut". */
  props?: Record<string, unknown>;
  /** Non-stopword words the parser couldn't map — surfaced for explainability. */
  unresolved: string[];
  confidence: number;
}

import type { Intent } from './recommend';

// --- small string helpers -------------------------------------------------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const singular = (s: string) => (s.length > 3 && s.endsWith('s') ? s.slice(0, -1) : s);

/** True when two strings are within one single-character edit (Levenshtein ≤ 1). */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const dl = a.length - b.length;
  if (dl > 1 || dl < -1) return false;
  if (a.length === b.length) {
    let diffs = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs++;
    return diffs === 1;
  }
  // One insertion/deletion: the shorter must embed in the longer with one skip.
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else if (!skipped) {
      skipped = true;
      j++;
    } else {
      return false;
    }
  }
  return true;
}

// --- intent ----------------------------------------------------------------

/** Ordered so the more specific intents win when several could match. */
const INTENT_KEYWORDS: [Intent, string[]][] = [
  ['correlation', ['correlation', 'correlate', 'relationship', 'related', 'against']],
  ['flow', ['flow', 'funnel', 'pipeline']],
  ['hierarchy', ['hierarchy', 'tree', 'nested', 'org chart', 'drilldown', 'drill down']],
  [
    'composition',
    [
      'breakdown',
      'share',
      'proportion',
      'proportions',
      'percentage',
      'composition',
      'makeup',
      'part of',
    ],
  ],
  ['distribution', ['distribution', 'spread', 'histogram', 'frequency']],
  ['trend', ['over time', 'trend', 'growth', 'decline', 'trajectory', 'history', 'timeline']],
  [
    'compare',
    [
      'compare',
      'comparison',
      'versus',
      'ranking',
      'rank',
      'top',
      'largest',
      'biggest',
      'highest',
      'lowest',
    ],
  ],
];

// --- chart type ------------------------------------------------------------

const CHART_KEYWORDS: [ChartType, string[]][] = [
  ['scatter', ['scatter', 'bubble']],
  ['line', ['line']],
  ['area', ['area']],
  ['pie', ['pie']],
  ['heatmap', ['heatmap', 'heat map', 'matrix']],
  ['sankey', ['sankey']],
  ['treemap', ['treemap', 'tree map']],
  ['radar', ['radar', 'spider']],
  ['bar', ['bar', 'column']],
];

// --- vibe ------------------------------------------------------------------

const MOOD_TO_PRESET: Record<string, string> = {
  professional: 'clean_blueprint',
  clean: 'clean_blueprint',
  blueprint: 'clean_blueprint',
  playful: 'comic_book',
  fun: 'comic_book',
  comic: 'comic_book',
  dark: 'midnight',
  retro: 'amber_crt',
  neon: 'neon',
  chalk: 'chalkboard',
  sketchy: 'messy_sketch',
  handdrawn: 'messy_sketch',
};

const PRESET_NAMES = Object.keys(VIBE_PRESETS);

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'as',
  'in',
  'on',
  'of',
  'to',
  'and',
  'with',
  'show',
  'me',
  'it',
  'make',
  'chart',
  'graph',
  'plot',
  'this',
  'that',
  'please',
  'using',
  'use',
  'for',
  'between',
  'into',
  'my',
  'data',
  'is',
  'are',
  'be',
  'render',
  'draw',
  'display',
]);

const BY_WORDS = new Set(['by', 'per', 'across']);
const SERIES_WORDS = new Set([
  'split',
  'grouped',
  'group',
  'colored',
  'color',
  'stacked',
  'series',
]);

// --- field matching --------------------------------------------------------

function matchField(token: string | undefined, profile: DataProfile): FieldProfile | undefined {
  if (!token) return undefined;
  const t = norm(token);
  if (!t) return undefined;
  const fields = profile.fields;
  return (
    fields.find((f) => norm(f.name) === t) ??
    fields.find((f) => singular(norm(f.name)) === singular(t)) ??
    fields.find((f) => norm(f.name).startsWith(t) || t.startsWith(norm(f.name))) ??
    fields.find((f) => norm(f.name).includes(t) || t.includes(norm(f.name)))
  );
}

// --- the parser ------------------------------------------------------------

export function parseChartQuery(query: string, profile: DataProfile): ChartHints {
  const lower = (query ?? '').toLowerCase();
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const consumed = new Set<number>(); // token indices the parser has explained
  const roles: Record<string, string> = {};
  const props: Record<string, unknown> = {};

  const hasPhrase = (kw: string) => (kw.includes(' ') ? lower.includes(kw) : tokens.includes(kw));
  const consumePhrase = (kw: string) => {
    for (const w of kw.split(' ')) {
      const i = tokens.indexOf(w);
      if (i >= 0) consumed.add(i);
    }
  };

  // intent
  let intent: Intent | undefined;
  for (const [name, kws] of INTENT_KEYWORDS) {
    const hit = kws.find(hasPhrase);
    if (hit) {
      intent = name;
      consumePhrase(hit);
      break;
    }
  }

  // chart type (+ donut → pie with an inner radius)
  let chartType: ChartType | undefined;
  if (hasPhrase('donut') || hasPhrase('doughnut')) {
    chartType = 'pie';
    props.innerRadius = 60;
    consumePhrase('donut');
    consumePhrase('doughnut');
  } else {
    for (const [name, kws] of CHART_KEYWORDS) {
      const hit = kws.find(hasPhrase);
      if (hit) {
        chartType = name;
        consumePhrase(hit);
        break;
      }
    }
  }

  const setRole = (key: string, field: FieldProfile | undefined, ...tokenIdx: number[]) => {
    if (field && !roles[key]) {
      roles[key] = field.name;
      for (const i of tokenIdx) if (i >= 0) consumed.add(i);
      const fi = tokens.findIndex(
        (t) => norm(t) === norm(field.name) || singular(norm(t)) === singular(norm(field.name)),
      );
      if (fi >= 0) consumed.add(fi);
    }
  };

  // explicit "X vs Y" / "X against Y"
  for (let i = 1; i < tokens.length - 1; i++) {
    if (tokens[i] === 'vs' || tokens[i] === 'versus' || tokens[i] === 'against') {
      setRole('x', matchField(tokens[i - 1], profile), i - 1, i);
      setRole('y', matchField(tokens[i + 1], profile), i + 1);
    }
  }

  // "between A and B"
  const between = tokens.indexOf('between');
  if (between >= 0) {
    const a = tokens[between + 1];
    const andAt = tokens.indexOf('and', between);
    const b = andAt >= 0 ? tokens[andAt + 1] : undefined;
    setRole('x', matchField(a, profile), between, between + 1);
    if (andAt >= 0) setRole('y', matchField(b, profile), andAt, andAt + 1);
  }

  // "from A to B"
  const fromAt = tokens.indexOf('from');
  if (fromAt >= 0) {
    const toAt = tokens.indexOf('to', fromAt);
    setRole('source', matchField(tokens[fromAt + 1], profile), fromAt, fromAt + 1);
    if (toAt >= 0) setRole('target', matchField(tokens[toAt + 1], profile), toAt, toAt + 1);
  }

  // "by/per/across X" (series when preceded by split/grouped/colored/…)
  for (let i = 0; i < tokens.length - 1; i++) {
    if (BY_WORDS.has(tokens[i])) {
      const field = matchField(tokens[i + 1], profile);
      const prev = tokens[i - 1];
      if (prev && SERIES_WORDS.has(prev)) {
        setRole('series', field, i, i - 1);
      } else {
        setRole('x', field, i);
      }
    }
  }

  // bare field mentions fill remaining roles by type
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const field = matchField(tokens[i], profile);
    if (!field) continue;
    consumed.add(i);
    if (field.type === 'quantitative') {
      if (!roles.y) roles.y = field.name;
      else if (!roles.x) roles.x = field.name;
    } else if (!roles.x) {
      roles.x = field.name;
    } else if (!roles.series) {
      roles.series = field.name;
    }
  }

  // vibe: preset name (fuzzy, underscores↔spaces) then mood word
  let vibe: VibeConfig | undefined;
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i) || STOPWORDS.has(tokens[i])) continue;
    const t = tokens[i];
    const preset = PRESET_NAMES.find((p) => {
      const parts = p.split('_');
      // Exact match on the full name or a word part; fuzzy only for longer
      // tokens so short stopwords like "in" can't drift into "ink".
      return (
        p === t ||
        parts.includes(t) ||
        (t.length >= 4 && parts.some((part) => part.length >= 4 && withinOneEdit(part, t)))
      );
    });
    if (preset) {
      vibe = preset as VibeConfig;
      consumed.add(i);
      // consume an adjacent word for multi-word presets like "sticky note"
      const parts = preset.split('_');
      if (parts.length > 1) {
        for (const p of parts) {
          const j = tokens.indexOf(p);
          if (j >= 0) consumed.add(j);
        }
      }
      break;
    }
  }
  if (!vibe) {
    for (let i = 0; i < tokens.length; i++) {
      if (consumed.has(i)) continue;
      const mood = MOOD_TO_PRESET[tokens[i]];
      if (mood) {
        vibe = mood as VibeConfig;
        consumed.add(i);
        break;
      }
    }
  }

  // leftover, non-stopword words are unresolved
  const unresolved = tokens.filter(
    (t, i) => !consumed.has(i) && !STOPWORDS.has(t) && Number.isNaN(Number(t)),
  );

  const hasRole = Object.keys(roles).length > 0;
  const confidence = Math.min(
    1,
    0.2 + (intent ? 0.3 : 0) + (hasRole ? 0.3 : 0) + (chartType ? 0.2 : 0),
  );

  return {
    intent,
    chartType,
    roles: hasRole ? roles : undefined,
    vibe,
    props: Object.keys(props).length ? props : undefined,
    unresolved,
    confidence,
  };
}
