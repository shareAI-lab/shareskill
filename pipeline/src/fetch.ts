// Fetch SKILL.md and all files from skill directory for security analysis

import { getTokenPool } from './github.js';
import { config } from './config.js';
import type { DiscoveredSkill } from './discover.js';

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface SkillContent extends DiscoveredSkill {
  skillMdContent: string;
  files: FileContent[];
  fileTree: Array<{ path: string; type: 'file' | 'dir'; size?: number }>;
  hasScripts: boolean;
  hasReferences: boolean;
  hasAssets: boolean;
  scriptCount: number;
  totalFiles: number;
}

const FETCH_MAX_RETRIES = 3;
const FETCH_BASE_DELAY = 2000;

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  return (
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up') ||
    message.includes('fetch failed') ||
    code === 'enotfound' ||
    code === 'etimedout' ||
    code === 'econnreset' ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = FETCH_MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = FETCH_BASE_DELAY * Math.pow(2, attempt - 1);
      console.warn(`  ${context}: ${error.message}, retrying in ${delay / 1000}s (${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

async function fetchFileContent(
  repoFullName: string,
  filePath: string
): Promise<{ content: string; size: number } | null> {
  return withRetry(async () => {
    const pool = await getTokenPool();
    const octokit = pool.getOctokit();
    const [owner, repo] = repoFullName.split('/');

    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
      });

      if (Array.isArray(data) || data.type !== 'file') {
        return null;
      }

      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        size: data.size,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }, `fetchFileContent(${repoFullName}/${filePath})`);
}

async function getDirectoryTree(
  repoFullName: string,
  skillPath: string,
  defaultBranch: string
): Promise<Array<{ path: string; type: 'blob' | 'tree'; size?: number; sha: string }>> {
  return withRetry(async () => {
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

      const prefix = skillPath ? `${skillPath}/` : '';

      return data.tree
        .filter((item) => {
          if (!item.path) return false;
          if (skillPath) {
            return item.path.startsWith(prefix) || item.path === skillPath;
          }
          return true;
        })
        .map((item) => ({
          path: item.path!,
          type: item.type as 'blob' | 'tree',
          size: item.size,
          sha: item.sha!,
        }));
    } catch (error: any) {
      console.warn(`  Failed to get tree for ${repoFullName}: ${error.message}`);
      return [];
    }
  }, `getDirectoryTree(${repoFullName})`);
}

function isBinaryFile(path: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.woff', '.woff2', '.ttf', '.eot',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.exe', '.dll', '.so', '.dylib',
    '.pyc', '.class', '.o',
  ];

  const ext = path.toLowerCase().slice(path.lastIndexOf('.'));
  return binaryExtensions.includes(ext);
}

export async function fetchSkillContent(skill: DiscoveredSkill): Promise<SkillContent | null> {
  // Fetch SKILL.md content
  const skillMdResult = await fetchFileContent(skill.repoFullName, skill.filePath);
  if (!skillMdResult) {
    return null;
  }

  // Check file size
  if (skillMdResult.size > config.skillMdMaxBytes) {
    console.warn(`  ${skill.repoFullName}/${skill.filePath}: too large (${skillMdResult.size} bytes)`);
    return null;
  }

  // Get directory tree
  const tree = await getDirectoryTree(skill.repoFullName, skill.skillPath, skill.defaultBranch);

  // Build file tree for storage (paths relative to skill directory)
  const fileTree: Array<{ path: string; type: 'file' | 'dir'; size?: number }> = [];
  const prefix = skill.skillPath ? `${skill.skillPath}/` : '';

  for (const item of tree) {
    // Skip the skill directory itself
    if (item.path === skill.skillPath) continue;

    // Calculate relative path
    let relativePath: string;
    if (skill.skillPath && item.path.startsWith(prefix)) {
      relativePath = item.path.slice(prefix.length);
    } else if (!skill.skillPath) {
      relativePath = item.path;
    } else {
      continue; // Skip items not under skill directory
    }

    // Skip SKILL.md as it's stored separately
    if (relativePath === 'SKILL.md') continue;
    // Skip empty paths
    if (!relativePath) continue;

    fileTree.push({
      path: relativePath,
      type: item.type === 'blob' ? 'file' : 'dir',
      size: item.size,
    });
  }

  // Analyze file structure
  let hasScripts = false;
  let hasReferences = false;
  let hasAssets = false;
  let scriptCount = 0;
  let totalFiles = 0;

  for (const item of fileTree) {
    if (item.type === 'file') {
      totalFiles++;
      if (item.path.startsWith('scripts/') || item.path.endsWith('.sh') || item.path.endsWith('.py')) {
        hasScripts = true;
        scriptCount++;
      }
      if (item.path.startsWith('references/')) {
        hasReferences = true;
      }
      if (item.path.startsWith('assets/') || item.path.startsWith('templates/')) {
        hasAssets = true;
      }
    }
  }

  // Fetch all non-binary files for security analysis (max 100KB each, max 20 files)
  // Optimized: parallel fetching with concurrency limit
  const filesToFetch = tree
    .filter((item) => {
      if (item.type !== 'blob') return false;
      if (item.path === skill.filePath) return false;
      if (isBinaryFile(item.path)) return false;
      if (item.size && item.size > 100000) return false;
      return true;
    })
    .slice(0, 20);

  // Parallel fetch with concurrency of 5
  const FETCH_CONCURRENCY = 5;
  const files: FileContent[] = [];

  for (let i = 0; i < filesToFetch.length; i += FETCH_CONCURRENCY) {
    const batch = filesToFetch.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const result = await fetchFileContent(skill.repoFullName, file.path);
          if (result) {
            const relativePath = skill.skillPath ? file.path.replace(prefix, '') : file.path;
            return {
              path: relativePath,
              content: result.content,
              size: result.size,
            };
          }
        } catch {
          // Skip failed files
        }
        return null;
      })
    );
    files.push(...results.filter((f): f is FileContent => f !== null));
  }

  return {
    ...skill,
    skillMdContent: skillMdResult.content,
    files,
    fileTree,
    hasScripts,
    hasReferences,
    hasAssets,
    scriptCount,
    totalFiles,
  };
}
