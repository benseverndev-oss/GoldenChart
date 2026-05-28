import type { FlowDirection, FlowEdge, FlowNode, FlowNodeShape } from '../types/charts';
import type { SequenceActorInput, SequenceMessageInput } from './sequence';
import type { DiagramSpec } from './spec';

/**
 * A dependency-light, hand-rolled parser for a **subset** of Mermaid, producing
 * a {@link DiagramSpec}. Supported: `flowchart`/`graph` (nodes, shapes, edges,
 * labels, direction), `sequenceDiagram` (participants + messages), and
 * `mindmap` (indentation-nested nodes). Anything else — including recognised but
 * unhandled constructs (notes, loops, erDiagram, …) — raises a
 * {@link MermaidParseError} rather than silently dropping content.
 */

export class MermaidParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MermaidParseError';
  }
}

const stripQuotes = (s: string): string => s.replace(/^"(.*)"$/, '$1').trim();

const cleanLines = (source: string): string[] =>
  source
    .split('\n')
    .map((l) => l.replace(/;\s*$/, '').trimEnd())
    .filter((l) => l.trim() !== '' && !l.trim().startsWith('%%'));

export function parseMermaid(source: string): DiagramSpec {
  const lines = cleanLines(source);
  if (lines.length === 0) throw new MermaidParseError('Empty Mermaid source.');

  const header = lines[0].trim();
  const keyword = header.split(/\s+/)[0];

  switch (keyword) {
    case 'flowchart':
    case 'graph':
      return parseFlowchart(header, lines.slice(1));
    case 'sequenceDiagram':
      return parseSequence(lines.slice(1));
    case 'mindmap':
      return parseMindmap(lines.slice(1));
    case 'erDiagram':
      throw new MermaidParseError('erDiagram parsing is not yet supported.');
    default:
      throw new MermaidParseError(
        `Unrecognized Mermaid diagram type: "${keyword}". Supported: flowchart, graph, sequenceDiagram, mindmap.`,
      );
  }
}

// ---- flowchart -------------------------------------------------------------

const DIRECTIONS: Record<string, FlowDirection> = {
  TB: 'TB',
  TD: 'TB',
  BT: 'BT',
  LR: 'LR',
  RL: 'RL',
};

function parseNodeToken(raw: string): { id: string; label?: string; shape?: FlowNodeShape } {
  const tok = raw.trim();
  let m: RegExpMatchArray | null;
  if ((m = tok.match(/^([A-Za-z0-9_]+)\(\((.*)\)\)$/)))
    return { id: m[1], label: stripQuotes(m[2]), shape: 'ellipse' };
  if ((m = tok.match(/^([A-Za-z0-9_]+)\(\[(.*)\]\)$/)))
    return { id: m[1], label: stripQuotes(m[2]), shape: 'ellipse' };
  if ((m = tok.match(/^([A-Za-z0-9_]+)\[(.*)\]$/)))
    return { id: m[1], label: stripQuotes(m[2]), shape: 'rect' };
  if ((m = tok.match(/^([A-Za-z0-9_]+)\((.*)\)$/)))
    return { id: m[1], label: stripQuotes(m[2]), shape: 'ellipse' };
  if ((m = tok.match(/^([A-Za-z0-9_]+)\{(.*)\}$/)))
    return { id: m[1], label: stripQuotes(m[2]), shape: 'diamond' };
  if ((m = tok.match(/^([A-Za-z0-9_]+)$/))) return { id: m[1] };
  throw new MermaidParseError(`Unrecognized flowchart node: "${tok}".`);
}

function parseFlowchart(header: string, body: string[]): DiagramSpec {
  const dirToken = header.split(/\s+/)[1];
  const direction = dirToken ? DIRECTIONS[dirToken.toUpperCase()] : undefined;
  if (dirToken && !direction)
    throw new MermaidParseError(`Unknown flowchart direction: "${dirToken}".`);

  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];

  const register = (token: string): string => {
    const parsed = parseNodeToken(token);
    const existing = nodes.get(parsed.id);
    if (existing) {
      if (parsed.label) existing.label = parsed.label;
      if (parsed.shape) existing.shape = parsed.shape;
    } else {
      nodes.set(parsed.id, {
        id: parsed.id,
        label: parsed.label ?? parsed.id,
        shape: parsed.shape,
      });
    }
    return parsed.id;
  };

  const addEdge = (lhs: string, rhs: string, label?: string) => {
    const from = register(lhs);
    const to = register(rhs);
    edges.push({ from, to, label: label ? stripQuotes(label) : undefined });
  };

  for (const line of body) {
    const stmt = line.trim();
    let m: RegExpMatchArray | null;
    if ((m = stmt.match(/^(.+?)\s*--+>\s*\|([^|]*)\|\s*(.+)$/))) addEdge(m[1], m[3], m[2]);
    else if ((m = stmt.match(/^(.+?)\s*--\s*([^|>][^>]*?)\s*--+>\s*(.+)$/)))
      addEdge(m[1], m[3], m[2]);
    else if ((m = stmt.match(/^(.+?)\s*--+>\s*(.+)$/))) addEdge(m[1], m[2]);
    else if ((m = stmt.match(/^(.+?)\s*---+\s*(.+)$/))) addEdge(m[1], m[2]);
    else register(stmt);
  }

  return { kind: 'flowchart', nodes: [...nodes.values()], edges, direction };
}

// ---- sequenceDiagram -------------------------------------------------------

const SEQ_UNSUPPORTED = [
  'note',
  'loop',
  'alt',
  'opt',
  'par',
  'activate',
  'deactivate',
  'rect',
  'critical',
  'break',
];

function parseSequence(body: string[]): DiagramSpec {
  const actors = new Map<string, SequenceActorInput>();
  const order: string[] = [];
  const messages: SequenceMessageInput[] = [];

  const ensureActor = (id: string, label?: string) => {
    if (!actors.has(id)) {
      actors.set(id, { id, label: label ?? id });
      order.push(id);
    } else if (label) {
      actors.get(id)!.label = label;
    }
  };

  for (const line of body) {
    const stmt = line.trim();
    let m: RegExpMatchArray | null;
    if ((m = stmt.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/))) {
      ensureActor(m[1], m[2] ? stripQuotes(m[2]) : undefined);
      continue;
    }
    if ((m = stmt.match(/^([A-Za-z0-9_]+)\s*(--?(?:>>|>|x|\)))\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/))) {
      const [, from, arrow, to, label] = m;
      ensureActor(from);
      ensureActor(to);
      messages.push({
        from,
        to,
        label: stripQuotes(label),
        kind: arrow.startsWith('--') ? 'reply' : 'sync',
      });
      continue;
    }
    const lead = stmt.split(/\s+/)[0].toLowerCase();
    if (SEQ_UNSUPPORTED.includes(lead)) {
      throw new MermaidParseError(`Unsupported sequenceDiagram construct: "${lead}".`);
    }
    throw new MermaidParseError(`Unrecognized sequenceDiagram line: "${stmt}".`);
  }

  return { kind: 'sequence', actors: order.map((id) => actors.get(id)!), messages };
}

// ---- mindmap ---------------------------------------------------------------

function parseMindmapLabel(raw: string): { label: string; shape?: FlowNodeShape } {
  const tok = raw.trim();
  let m: RegExpMatchArray | null;
  if ((m = tok.match(/^[A-Za-z0-9_]*\(\((.*)\)\)$/)))
    return { label: stripQuotes(m[1]), shape: 'ellipse' };
  if ((m = tok.match(/^[A-Za-z0-9_]*\[(.*)\]$/)))
    return { label: stripQuotes(m[1]), shape: 'rect' };
  if ((m = tok.match(/^[A-Za-z0-9_]*\((.*)\)$/)))
    return { label: stripQuotes(m[1]), shape: 'ellipse' };
  return { label: stripQuotes(tok) };
}

function parseMindmap(body: string[]): DiagramSpec {
  const nodes: FlowNode[] = [];
  const stack: { indent: number; id: string }[] = [];
  let counter = 0;

  for (const line of body) {
    const indent = line.length - line.trimStart().length;
    const { label, shape } = parseMindmapLabel(line);
    const id = `m${counter++}`;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].id : undefined;
    nodes.push({ id, label, shape, parent });
    stack.push({ indent, id });
  }

  const roots = nodes.filter((n) => n.parent == null);
  if (roots.length !== 1) {
    throw new MermaidParseError(`A mindmap needs exactly one root, found ${roots.length}.`);
  }
  return { kind: 'mindmap', nodes };
}
