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
});
