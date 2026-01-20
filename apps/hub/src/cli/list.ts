import pc from 'picocolors';
import { listLocalSkills } from '../store/skills.js';

export async function list(): Promise<void> {
  const skills = listLocalSkills();

  if (skills.length === 0) {
    console.log(pc.dim('No skills downloaded yet.'));
    console.log(pc.dim('Run `npx shareskill download <skill_key>` to download a skill.'));
    return;
  }

  console.log(pc.bold(`Downloaded skills (${skills.length}):\n`));

  for (const skill of skills) {
    console.log(`  ${pc.cyan(skill.name)}`);
    console.log(pc.dim(`    Location: ${skill.path}`));
    console.log(pc.dim(`    Downloaded: ${skill.downloadedAt}`));
    console.log();
  }
}
