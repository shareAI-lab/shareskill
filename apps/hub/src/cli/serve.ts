import pc from 'picocolors';
import { startMcpServer } from '../mcp/server.js';
import { startPanelServer } from '../panel/server.js';

export async function serve(port: number): Promise<void> {
  console.log(pc.cyan('Starting ShareSkill Hub...\n'));

  startMcpServer();
  console.log(pc.green('* MCP Server ready'));

  await startPanelServer(port);
  console.log(pc.green(`* Management panel: http://localhost:${port}`));

  console.log(pc.dim('\nPress Ctrl+C to stop\n'));
}
