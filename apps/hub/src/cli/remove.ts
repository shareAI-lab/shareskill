import pc from 'picocolors';
import ora from 'ora';
import { removeLocalSkill } from '../store/skills.js';

export async function remove(name: string): Promise<void> {
  const spinner = ora(`Removing ${name}...`).start();

  try {
    const removed = removeLocalSkill(name);

    if (removed) {
      spinner.succeed(`Removed ${name}`);
    } else {
      spinner.fail(`Skill "${name}" not found locally`);
    }
  } catch (error) {
    spinner.fail(`Failed to remove: ${(error as Error).message}`);
  }
}
