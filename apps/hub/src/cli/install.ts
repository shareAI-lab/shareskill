import pc from 'picocolors';
import ora from 'ora';
import { getSkillPackage } from '../mcp/api.js';
import { saveLocalSkill } from '../store/skills.js';

export async function install(source: string): Promise<void> {
  const spinner = ora(`Downloading ${source}...`).start();

  try {
    const pkg = await getSkillPackage(source);
    const installPath = saveLocalSkill(pkg);

    spinner.succeed(`Downloaded ${pkg.name}`);
    console.log(pc.dim(`  Location: ${installPath}`));
    console.log(pc.dim(`  Files: ${pkg.files.map(f => f.path).join(', ')}`));
  } catch (error) {
    spinner.fail(`Failed to download: ${(error as Error).message}`);
  }
}
