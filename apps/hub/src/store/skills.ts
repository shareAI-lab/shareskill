// Local skill management

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, relative, dirname } from 'path';
import { LOCAL_STORAGE_PATH, SKILLS_DIR, CONFIG_FILE } from '@shareskill/shared';
import type { SkillPackage } from '../mcp/types.js';

const STORAGE_ROOT = join(homedir(), LOCAL_STORAGE_PATH);
const SKILLS_ROOT = join(STORAGE_ROOT, SKILLS_DIR);
const CONFIG_PATH = join(STORAGE_ROOT, CONFIG_FILE);

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export interface LocalSkillInfo {
  name: string;
  path: string;
  downloadedAt: string;
  files: string[];
}

export interface StoredConfig {
  downloaded_at?: Record<string, string>;
}

export function loadConfig(): StoredConfig {
  ensureDir(STORAGE_ROOT);
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

export function saveConfig(config: StoredConfig): void {
  ensureDir(STORAGE_ROOT);
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function listFilesRecursive(basePath: string, currentPath: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relativePath = relative(basePath, fullPath);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(basePath, fullPath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

export function listLocalSkills(): LocalSkillInfo[] {
  ensureDir(SKILLS_ROOT);
  const stored = loadConfig();
  const skills: LocalSkillInfo[] = [];

  if (!existsSync(SKILLS_ROOT)) {
    return skills;
  }

  const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const name of dirs) {
    const skillPath = join(SKILLS_ROOT, name);
    const files = listFilesRecursive(skillPath, skillPath);

    skills.push({
      name,
      path: skillPath,
      downloadedAt: stored.downloaded_at?.[name] || 'unknown',
      files,
    });
  }

  return skills;
}

export function getLocalSkill(name: string): { content: string; files: string[] } | null {
  const skillPath = join(SKILLS_ROOT, name);

  if (!existsSync(skillPath)) {
    return null;
  }

  const skillMdPath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    return null;
  }

  const content = readFileSync(skillMdPath, 'utf-8');
  const files = listFilesRecursive(skillPath, skillPath);

  return { content, files };
}

export function getLocalSkillResource(name: string, resourcePath: string): string | null {
  const fullPath = join(SKILLS_ROOT, name, resourcePath);

  if (!existsSync(fullPath)) {
    return null;
  }

  return readFileSync(fullPath, 'utf-8');
}

export function saveLocalSkill(pkg: SkillPackage): string {
  ensureDir(SKILLS_ROOT);
  const stored = loadConfig();

  const skillName = pkg.name;
  const skillPath = join(SKILLS_ROOT, skillName);

  // Create skill directory
  if (!existsSync(skillPath)) {
    mkdirSync(skillPath, { recursive: true });
  }

  // Write all files
  for (const file of pkg.files) {
    const filePath = join(skillPath, file.path);
    const fileDir = dirname(filePath);

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }

    writeFileSync(filePath, file.content);
  }

  // Update config
  stored.downloaded_at = stored.downloaded_at || {};
  stored.downloaded_at[skillName] = new Date().toISOString();
  saveConfig(stored);

  return skillPath;
}

export function removeLocalSkill(name: string): boolean {
  const stored = loadConfig();
  const skillPath = join(SKILLS_ROOT, name);

  if (!existsSync(skillPath)) {
    return false;
  }

  rmSync(skillPath, { recursive: true, force: true });

  // Update config
  if (stored.downloaded_at) {
    delete stored.downloaded_at[name];
    saveConfig(stored);
  }

  return true;
}
