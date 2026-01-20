// Skill Discovery - Find SKILL.md files across GitHub
// Core logic: Compare GitHub reality vs DB records, find gaps
// Handles:
// 1. New repos with SKILL.md (not in DB)
// 2. Existing repos with new SKILL.md files added
// 3. Existing skills with SHA changes (content updated)
// 4. Does NOT delete - only discovers what needs to be added/updated

import { getTokenPool } from './github.js';
import { config } from './config.js';
import { createSupabaseServiceClient } from '@shareskill/db';

export interface DiscoveredSkill {
  repoFullName: string;
  skillPath: string;
  filePath: string;
  sha: string;
  repoUrl: string;
  repoStars: number;
  repoPushedAt: string | null;
  defaultBranch: string;
}

interface RepoInfo {
  fullName: string;
  htmlUrl: string;
  stars: number;
  pushedAt: string | null;
  defaultBranch: string;
}

const supabase = createSupabaseServiceClient(config.supabaseUrl, config.supabaseServiceKey);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DBSkillInfo {
  sha: string;
  skillSlug: string;
  repoStars: number;
}

// Load ALL existing skills from DB
// Returns two maps:
// 1. skillsByKey: "repo:path" -> {sha, skillSlug, repoStars}
// 2. bestBySlug: "skillSlug" -> {repoFullName, repoStars} (best version per slug)
async function loadDBSkills(): Promise<{
  skillsByKey: Map<string, DBSkillInfo>;
  bestBySlug: Map<string, { repoFullName: string; repoStars: number }>;
}> {
  const { data, error } = await supabase
    .from('skills')
    .select('repo_full_name, skill_path, skill_md_sha, skill_slug, repo_stars');

  if (error) {
    console.warn(`  DB query error: ${error.message}`);
    return { skillsByKey: new Map(), bestBySlug: new Map() };
  }

  const skillsByKey = new Map<string, DBSkillInfo>();
  const bestBySlug = new Map<string, { repoFullName: string; repoStars: number }>();

  for (const row of data || []) {
    const key = `${row.repo_full_name}:${row.skill_path || ''}`;
    const slug = row.skill_slug || '';
    const stars = row.repo_stars || 0;

    skillsByKey.set(key, {
      sha: row.skill_md_sha || '',
      skillSlug: slug,
      repoStars: stars,
    });

    // Track best version per slug (highest stars)
    if (slug) {
      const existing = bestBySlug.get(slug);
      if (!existing || stars > existing.repoStars) {
        bestBySlug.set(slug, { repoFullName: row.repo_full_name, repoStars: stars });
      }
    }
  }

  return { skillsByKey, bestBySlug };
}

// Search GitHub for ALL repos containing SKILL.md
async function searchGitHubRepos(): Promise<Set<string>> {
  const pool = await getTokenPool();
  const octokit = pool.getOctokit();
  const repos = new Set<string>();

  console.log(`  Searching GitHub: filename:SKILL.md...`);

  try {
    let page = 1;
    const maxPages = 10; // GitHub code search limit

    while (page <= maxPages) {
      const response = await octokit.rest.search.code({
        q: `filename:SKILL.md`,
        per_page: 100,
        page,
      });

      for (const item of response.data.items) {
        repos.add(item.repository.full_name);
      }

      const total = response.data.total_count;
      console.log(`    Page ${page}: found ${response.data.items.length} files (${repos.size} unique repos, ~${total} total matches)`);

      if (response.data.items.length < 100) break;
      page++;

      await sleep(2000); // Code search rate limit
    }
  } catch (error: any) {
    console.warn(`    Search error: ${error.message}`);
  }

  return repos;
}

// Get ALL SKILL.md files in a repo
async function getRepoSkillFiles(
  repoFullName: string,
  defaultBranch: string
): Promise<Array<{ path: string; sha: string }>> {
  const pool = await getTokenPool();
  const octokit = pool.getOctokit();
  const [owner, repo] = repoFullName.split('/');

  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: 'true',
    });

    return data.tree
      .filter((item) => item.type === 'blob' && item.path?.endsWith('SKILL.md'))
      .map((item) => ({
        path: item.path!,
        sha: item.sha!,
      }));
  } catch (error: any) {
    return [];
  }
}

// Fetch repo metadata in batches
async function fetchRepoMetadata(repoNames: string[]): Promise<Map<string, RepoInfo>> {
  const pool = await getTokenPool();
  const octokit = pool.getOctokit();
  const result = new Map<string, RepoInfo>();
  const batchSize = 50;

  for (let i = 0; i < repoNames.length; i += batchSize) {
    const batch = repoNames.slice(i, i + batchSize);

    // Try GraphQL first (faster)
    const queryParts = batch.map((name, idx) => {
      const [owner, repo] = name.split('/');
      return `repo${idx}: repository(owner: "${owner}", name: "${repo}") {
        nameWithOwner url stargazerCount pushedAt
        defaultBranchRef { name }
      }`;
    });

    try {
      const response: any = await octokit.graphql(`query { ${queryParts.join('\n')} }`);

      for (let j = 0; j < batch.length; j++) {
        const data = response[`repo${j}`];
        if (data) {
          result.set(batch[j], {
            fullName: data.nameWithOwner,
            htmlUrl: data.url,
            stars: data.stargazerCount,
            pushedAt: data.pushedAt,
            defaultBranch: data.defaultBranchRef?.name || 'main',
          });
        }
      }
    } catch {
      // Fallback to REST
      for (const name of batch) {
        try {
          const [owner, repo] = name.split('/');
          const { data } = await octokit.rest.repos.get({ owner, repo });
          result.set(name, {
            fullName: data.full_name,
            htmlUrl: data.html_url,
            stars: data.stargazers_count,
            pushedAt: data.pushed_at,
            defaultBranch: data.default_branch,
          });
        } catch {
          // Skip inaccessible repos
        }
      }
    }

    if (i + batchSize < repoNames.length) {
      await sleep(100);
    }
  }

  return result;
}

export async function discover(): Promise<DiscoveredSkill[]> {
  // Step 1: Load what we already have in DB
  console.log('Step 1: Loading existing skills from DB...');
  const { skillsByKey, bestBySlug } = await loadDBSkills();
  const dbRepos = new Set([...skillsByKey.keys()].map(k => k.split(':')[0]));
  console.log(`  Found ${skillsByKey.size} skills from ${dbRepos.size} repos in DB`);
  console.log(`  Tracking ${bestBySlug.size} unique skill slugs for deduplication\n`);

  // Step 2: Search GitHub for repos with SKILL.md
  console.log('Step 2: Searching GitHub for SKILL.md files...');
  const githubRepos = await searchGitHubRepos();
  console.log(`  Found ${githubRepos.size} repos on GitHub\n`);

  if (githubRepos.size === 0) {
    console.log('No repos found on GitHub.');
    return [];
  }

  // Step 3: Determine which repos to scan
  // - All new repos (not in DB)
  // - All existing repos (might have new skills or updates)
  let reposToScan = Array.from(githubRepos);

  // Apply dev limit if set
  if (config.devRepoLimit > 0 && reposToScan.length > config.devRepoLimit) {
    reposToScan = reposToScan.slice(0, config.devRepoLimit);
    console.log(`  DEV_REPO_LIMIT: Scanning only ${reposToScan.length} repos\n`);
  }

  // Step 4: Fetch metadata for repos to scan
  console.log('Step 3: Fetching repository metadata...');
  const repoMetadata = await fetchRepoMetadata(reposToScan);
  console.log(`  Got metadata for ${repoMetadata.size} repos\n`);

  // Step 5: Scan each repo's tree and compare with DB
  console.log('Step 4: Scanning repos and comparing with DB...');
  const toProcess: DiscoveredSkill[] = [];
  // Track best version per slug during discovery (for new skills not yet in DB)
  const discoveredBestBySlug = new Map<string, { repoFullName: string; repoStars: number }>();
  let skippedDuplicates = 0;

  for (const [repoName, info] of repoMetadata) {
    const skillFiles = await getRepoSkillFiles(repoName, info.defaultBranch);

    if (skillFiles.length === 0) continue;

    // Skip repos with too many skills
    if (skillFiles.length > config.maxSkillsPerRepo) {
      console.log(`  Skipping ${repoName}: ${skillFiles.length} skills (max ${config.maxSkillsPerRepo})`);
      continue;
    }

    let newCount = 0;
    let updatedCount = 0;

    for (const file of skillFiles) {
      // Extract skill path (directory containing SKILL.md)
      const pathParts = file.path.split('/');
      pathParts.pop(); // Remove "SKILL.md"
      const skillPath = pathParts.join('/');

      // Compute skill_slug (same logic as load.ts)
      const skillSlug = skillPath ? skillPath.split('/').pop()! : repoName.split('/')[1];

      const dbKey = `${repoName}:${skillPath}`;
      const dbInfo = skillsByKey.get(dbKey);

      // Check for duplicate: does a better version already exist?
      // Either in DB or already discovered in this run
      const dbBest = bestBySlug.get(skillSlug);
      const discoveredBest = discoveredBestBySlug.get(skillSlug);

      // Determine if this repo's version is the best
      let isBestVersion = true;

      if (dbBest && dbBest.repoFullName !== repoName && dbBest.repoStars >= info.stars) {
        // DB has a better or equal version from a different repo
        isBestVersion = false;
      }

      if (discoveredBest && discoveredBest.repoFullName !== repoName && discoveredBest.repoStars >= info.stars) {
        // Already discovered a better or equal version from a different repo in this run
        isBestVersion = false;
      }

      if (!isBestVersion) {
        skippedDuplicates++;
        continue;
      }

      // Update discovered best tracking
      const currentDiscoveredBest = discoveredBestBySlug.get(skillSlug);
      if (!currentDiscoveredBest || info.stars > currentDiscoveredBest.repoStars) {
        discoveredBestBySlug.set(skillSlug, { repoFullName: repoName, repoStars: info.stars });
      }

      // Decide if we need to process this skill
      let needsProcessing = false;

      if (!dbInfo) {
        // New skill - not in DB
        needsProcessing = true;
        newCount++;
      } else if (dbInfo.sha !== file.sha) {
        // Existing skill but SHA changed - content updated
        needsProcessing = true;
        updatedCount++;
      } else if (config.forceAnalyzeAll) {
        // Force reprocess
        needsProcessing = true;
      }
      // else: same SHA, skip

      if (needsProcessing) {
        toProcess.push({
          repoFullName: repoName,
          skillPath,
          filePath: file.path,
          sha: file.sha,
          repoUrl: info.htmlUrl,
          repoStars: info.stars,
          repoPushedAt: info.pushedAt,
          defaultBranch: info.defaultBranch,
        });
      }
    }

    if (newCount > 0 || updatedCount > 0) {
      console.log(`  ${repoName}: ${skillFiles.length} total, ${newCount} new, ${updatedCount} updated`);
    }
  }

  if (skippedDuplicates > 0) {
    console.log(`\n  Skipped ${skippedDuplicates} fork/duplicate skills (better version exists)`);
  }

  // Apply skill limit if set
  let result = toProcess;
  if (config.devSkillLimit > 0 && toProcess.length > config.devSkillLimit) {
    result = toProcess.slice(0, config.devSkillLimit);
    console.log(`\n  DEV_SKILL_LIMIT: Processing only ${result.length} of ${toProcess.length} skills`);
  }

  console.log(`\n  Total: ${result.length} skills to process\n`);
  return result;
}

// Mark skills as stale if they haven't been seen in recent scans
// Called after pipeline run to soft-delete skills that no longer exist on GitHub
export async function markStaleSkills(seenKeys: Set<string>): Promise<number> {
  const staleThresholdDays = 30;
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleThresholdDays);

  // Get all skills that weren't seen and haven't been checked recently
  const { data: staleSkills, error } = await supabase
    .from('skills')
    .select('id, repo_full_name, skill_path, last_checked_at')
    .lt('last_checked_at', staleDate.toISOString());

  if (error || !staleSkills) {
    console.warn(`  Failed to query stale skills: ${error?.message}`);
    return 0;
  }

  // Filter to skills not in current scan
  const toMark = staleSkills.filter(s => {
    const key = `${s.repo_full_name}:${s.skill_path || ''}`;
    return !seenKeys.has(key);
  });

  if (toMark.length === 0) {
    return 0;
  }

  // Soft delete by setting deleted_at (if column exists) or just log
  console.log(`  Found ${toMark.length} potentially stale skills (not seen in ${staleThresholdDays} days)`);
  for (const skill of toMark.slice(0, 5)) {
    console.log(`    - ${skill.repo_full_name}:${skill.skill_path || '__root__'}`);
  }
  if (toMark.length > 5) {
    console.log(`    ... and ${toMark.length - 5} more`);
  }

  return toMark.length;
}
