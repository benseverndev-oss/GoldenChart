import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tools } from './tools';

/** Build the GoldenChart MCP server with every tool registered. */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'goldenchart', version: '0.0.1' });
  for (const tool of tools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
  return server;
}
