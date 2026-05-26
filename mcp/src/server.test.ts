import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './server';

/** Full MCP round-trip over an in-memory transport pair (no child process). */
async function connectedClient(): Promise<Client> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('GoldenChart MCP server', () => {
  it('lists render_bar_chart over the protocol', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('render_bar_chart');
  });

  it('returns SVG when render_bar_chart is called', async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'render_bar_chart',
      arguments: {
        data: [
          { label: 'a', value: 3 },
          { label: 'b', value: 7 },
        ],
        width: 320,
        height: 200,
      },
    });
    const content = result.content as { type: string; text: string }[];
    expect(content[0].text).toContain('<svg');
    expect(content[0].text).toContain('<path');
    const structured = result.structuredContent as { meta: { kind: string } };
    expect(structured.meta.kind).toBe('bar');
  });

  it('exposes the vibe-presets resource', async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain('vibe://presets');
    const read = await client.readResource({ uri: 'vibe://presets' });
    expect((read.contents[0] as { text: string }).text).toContain('messy_sketch');
  });

  it('serves a JSON Schema for a chart type via the schema template', async () => {
    const client = await connectedClient();
    const read = await client.readResource({ uri: 'schema://chart/bar' });
    const schema = JSON.parse((read.contents[0] as { text: string }).text);
    expect(JSON.stringify(schema)).toContain('data');
  });

  it('exposes the make-me-a-chart prompt', async () => {
    const client = await connectedClient();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('make-me-a-chart');
    const prompt = await client.getPrompt({
      name: 'make-me-a-chart',
      arguments: { dataDescription: 'monthly revenue', mood: 'playful' },
    });
    const text = (prompt.messages[0].content as { text: string }).text;
    expect(text).toContain('monthly revenue');
    expect(text).toContain('playful');
  });

  it('builds a diagram from a Mermaid snippet over the protocol', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('build_diagram_from_mermaid');
    const result = await client.callTool({
      name: 'build_diagram_from_mermaid',
      arguments: { source: 'flowchart TD\n  A[Start] --> B((Done))', width: 320, height: 240 },
    });
    const content = result.content as { type: string; text: string }[];
    expect(content[0].text).toContain('<svg');
    expect(content[0].text).toContain('Start');
  });

  it('exposes the diagram-spec doc and make-me-a-diagram prompt', async () => {
    const client = await connectedClient();
    const read = await client.readResource({ uri: 'docs://diagram-spec' });
    expect((read.contents[0] as { text: string }).text).toContain('render_diagram');
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('make-me-a-diagram');
  });

  it('exposes the compose-spec doc and compose-a-figure prompt', async () => {
    const client = await connectedClient();
    const read = await client.readResource({ uri: 'docs://compose-spec' });
    const doc = (read.contents[0] as { text: string }).text;
    expect(doc).toContain('compose_surface');
    // catalogs the new shape scene kinds
    for (const kind of ['regular-polygon', 'wedge', 'arrow']) expect(doc).toContain(kind);

    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('compose-a-figure');
    const prompt = await client.getPrompt({
      name: 'compose-a-figure',
      arguments: { figureDescription: 'a labelled pipeline', mood: 'playful' },
    });
    const text = (prompt.messages[0].content as { text: string }).text;
    expect(text).toContain('compose_surface');
    expect(text).toContain('docs://compose-spec');
    expect(text).toContain('a labelled pipeline');
  });
});
