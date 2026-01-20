import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { AGENT_CONFIGS, type AgentType } from '@shareskill/shared';

function expandPath(p: string): string {
  return p.replace(/^~/, homedir());
}

interface AgentStatus {
  name: string;
  detected: boolean;
  configured: boolean;
  configPath: string;
}

function detectAgents(): AgentStatus[] {
  const results: AgentStatus[] = [];

  for (const [key, config] of Object.entries(AGENT_CONFIGS)) {
    const configPath = expandPath(config.config_path);
    const detected = existsSync(dirname(configPath));
    let configured = false;

    if (detected && existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        configured = !!parsed.mcpServers?.shareskill;
      } catch {
        configured = false;
      }
    }

    results.push({
      name: config.name,
      detected,
      configured,
      configPath,
    });
  }

  return results;
}

function configureAgent(configPath: string): boolean {
  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    (config.mcpServers as Record<string, unknown>).shareskill = {
      command: 'npx',
      args: ['-y', 'shareskill', 'serve'],
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

export async function setup(): Promise<void> {
  const spinner = ora('Detecting installed agents...').start();

  const agents = detectAgents();
  spinner.stop();

  console.log(pc.bold('\nDetected agents:\n'));

  const detected = agents.filter((a) => a.detected);
  const notDetected = agents.filter((a) => !a.detected);

  for (const agent of detected) {
    if (agent.configured) {
      console.log(pc.green(`  ${pc.bold(pc.green('*'))} ${agent.name} ${pc.dim('(already configured)')}`));
    } else {
      console.log(pc.green(`  ${pc.bold(pc.green('*'))} ${agent.name}`));
    }
  }

  for (const agent of notDetected) {
    console.log(pc.dim(`  ${pc.red('x')} ${agent.name} (not found)`));
  }

  const toConfig = detected.filter((a) => !a.configured);

  if (toConfig.length === 0) {
    if (detected.length > 0) {
      console.log(pc.green('\nAll detected agents are already configured!'));
    } else {
      console.log(pc.yellow('\nNo agents detected. Please install an agent first.'));
    }
    return;
  }

  console.log(pc.bold('\nConfiguring MCP...\n'));

  for (const agent of toConfig) {
    const configSpinner = ora(`Configuring ${agent.name}...`).start();
    const success = configureAgent(agent.configPath);

    if (success) {
      configSpinner.succeed(`Added ShareSkill to ${agent.name}`);
    } else {
      configSpinner.fail(`Failed to configure ${agent.name}`);
    }
  }

  console.log(pc.bold(pc.green('\nSetup complete!\n')));
  console.log('Now you can:');
  console.log(pc.dim('  - Say "search skills for PDF" in any Agent'));
  console.log(pc.dim('  - Say "install the xlsx skill" in any Agent'));
  console.log(pc.dim('  - Visit http://localhost:3001 for dashboard'));
  console.log(pc.dim('  - Visit https://shareskill.run to discover'));
  console.log();
}
