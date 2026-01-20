import { Command } from 'commander';
import pc from 'picocolors';
import { setup } from './setup.js';
import { serve } from './serve.js';
import { install } from './install.js';
import { list } from './list.js';
import { remove } from './remove.js';

const program = new Command();

const LOGO = `
 _____ _                    _____ _    _ _ _
/  ___| |                  /  ___| |  (_) | |
\\ \`--.| |__   __ _ _ __ ___\\ \`--.| | ___| | |
 \`--. \\ '_ \\ / _\` | '__/ _ \\\`--. \\ |/ / | | |
/\\__/ / | | | (_| | | |  __/\\__/ /   <| | | |
\\____/|_| |_|\\__,_|_|  \\___\\____/|_|\\_\\_|_|_|
`;

program
  .name('shareskill')
  .description('ShareSkill Hub - Discover and manage Agent Skills')
  .version('0.1.0');

program
  .command('setup')
  .description('Configure ShareSkill for your AI agents')
  .action(async () => {
    console.log(pc.cyan(LOGO));
    console.log(pc.bold('Welcome to ShareSkill!\n'));
    await setup();
  });

program
  .command('serve')
  .description('Start the MCP server and management panel')
  .option('-p, --port <port>', 'Port for management panel', '3001')
  .action(async (options) => {
    await serve(parseInt(options.port));
  });

program
  .command('download <skill_key>')
  .description('Download a skill from ShareSkill')
  .action(async (skillKey) => {
    await install(skillKey);
  });

program
  .command('list')
  .description('List downloaded skills')
  .action(async () => {
    await list();
  });

program
  .command('remove <name>')
  .description('Remove a downloaded skill')
  .action(async (name) => {
    await remove(name);
  });

program.parse();
