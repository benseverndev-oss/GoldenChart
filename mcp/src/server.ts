import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tools } from './tools';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

/** Build the GoldenChart MCP server with every tool, resource, and prompt. */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'goldenchart', version: '0.0.1' });
  for (const tool of tools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
  registerResources(server);
  registerPrompts(server);
  return server;
}
