// MCP Tool definitions with remote_* / local_* naming convention

import type { SkillListItem, SkillDetail, SecurityWarning } from './types.js';
import type { LocalSkillInfo } from '../store/skills.js';

export const TOOL_DEFINITIONS = [
  // ===== Remote Tools =====
  {
    name: 'remote_search_skills',
    description: 'Search for Agent Skills online to help with the current task. Returns a list of matching skills with basic info. After finding a relevant skill, use remote_get_skill to get the full instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query describing what you need help with',
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 5, max: 10)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'remote_get_skill',
    description: 'Get complete skill details including full SKILL.md content. After calling this, you have all the knowledge needed to help the user - you can start working immediately without downloading. Download is optional and only needed if the user wants to save this skill for future offline reuse.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_key: {
          type: 'string',
          description: 'Skill key from search results (e.g., "anthropics/skills:skills/pdf")',
        },
      },
      required: ['skill_key'],
    },
  },
  {
    name: 'remote_get_skill_resource',
    description: 'Get a specific resource file from an online skill package (script, reference doc, or asset). Use this when following skill instructions that reference additional files.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_key: {
          type: 'string',
          description: 'Skill key',
        },
        resource_path: {
          type: 'string',
          description: "Relative path to resource (e.g., 'scripts/extract.py', 'references/API.md')",
        },
      },
      required: ['skill_key', 'resource_path'],
    },
  },
  {
    name: 'remote_download_skill',
    description: 'Download a skill to local storage for future offline reuse. This downloads all skill files to ~/.shareskill/skills/. Only needed if user wants persistent access - you can use skill knowledge immediately after remote_get_skill without downloading.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_key: {
          type: 'string',
          description: 'Skill key to download',
        },
        confirm_security: {
          type: 'boolean',
          description: 'Confirm download despite security warnings',
          default: false,
        },
      },
      required: ['skill_key'],
    },
  },
  // ===== Local Tools =====
  {
    name: 'local_list_skills',
    description: 'List all locally downloaded skills. These are skills previously downloaded for offline reuse.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'local_get_skill',
    description: "Load a downloaded skill's SKILL.md content from local storage. Use this when you need to work with a previously downloaded skill - no network required.",
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill name (folder name in ~/.shareskill/skills/)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'local_get_skill_resource',
    description: 'Read a resource file from a downloaded skill. No network required.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill name',
        },
        resource_path: {
          type: 'string',
          description: 'Relative path to resource',
        },
      },
      required: ['name', 'resource_path'],
    },
  },
  {
    name: 'local_remove_skill',
    description: 'Remove a downloaded skill from local storage.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill name to remove',
        },
      },
      required: ['name'],
    },
  },
];

// Format helpers for tool responses

export function formatSearchResults(items: SkillListItem[], query: string): string {
  if (items.length === 0) {
    return `No skills found for "${query}". Try a different search query.`;
  }

  let result = `Found ${items.length} skills for "${query}":\n\n`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    result += `${i + 1}. **${item.name}** (${item.repo_full_name}) - ${item.repo_stars.toLocaleString()} stars\n`;
    result += `   ${item.tagline}\n`;
    result += `   Category: ${item.category} | Tags: ${item.tags.slice(0, 5).join(', ')}\n\n`;
  }

  result += `---\nNext steps:\n`;
  result += `- remote_get_skill(skill_key) - Get full skill instructions (can start working immediately)\n`;
  result += `- remote_download_skill(skill_key) - Download to local for future reuse (optional)`;

  return result;
}

export function formatSkillDetail(skill: SkillDetail): string {
  let result = `# ${skill.name} (${skill.repo_full_name})\n\n`;

  result += `## Overview\n${skill.tagline}\n\n`;

  result += `## Metadata\n`;
  result += `- **Category**: ${skill.category}\n`;
  result += `- **License**: ${skill.license || 'Unknown'}\n`;
  result += `- **Compatibility**: ${skill.compatibility || 'Unknown'}\n`;
  result += `- **Stars**: ${skill.repo_stars.toLocaleString()} | Updated: ${formatDate(skill.repo_pushed_at)}\n\n`;

  if (skill.security_warnings.length > 0) {
    result += `## Security Warnings\n`;
    for (const w of skill.security_warnings) {
      result += `**${w.severity.toUpperCase()}**: ${w.file}:${w.line}\n`;
      result += `  ${w.description}\n`;
      if (w.code_snippet) {
        result += `  \`${w.code_snippet}\`\n`;
      }
      result += `\n`;
    }
  } else {
    result += `## Security\nNo security warnings.\n\n`;
  }

  result += `## Package Contents\n\`\`\`\n${skill.name}/\n`;
  for (const file of skill.file_tree.slice(0, 20)) {
    const prefix = '   ';
    const suffix = file.type === 'dir' ? '/' : (file.size ? ` (${formatSize(file.size)})` : '');
    result += `${prefix}${file.path}${suffix}\n`;
  }
  if (skill.file_tree.length > 20) {
    result += `   ... and ${skill.file_tree.length - 20} more files\n`;
  }
  result += `\`\`\`\n\n`;

  result += `## SKILL.md Content\n${skill.skill_md_content || '(No content available)'}\n\n`;

  result += `---\n\n## What's Next?\n\n`;
  result += `You now have all the knowledge from this skill. You can:\n\n`;
  result += `1. **Start working immediately** - Use the instructions above to help the user\n`;
  result += `2. **Ask the user** - "I found a skill that can help. Should I start working now, or would you like me to download it locally for future reuse?"\n\n`;
  result += `If the user wants to download for reuse:\n`;
  result += `- remote_download_skill("${skill.skill_key}")\n\n`;
  result += `To get additional resource files (if needed during work):\n`;
  for (const file of skill.file_tree.filter(f => f.type === 'file' && f.path !== 'SKILL.md').slice(0, 3)) {
    result += `- remote_get_skill_resource("${skill.skill_key}", "${file.path}")\n`;
  }

  return result;
}

export function formatDownloadResult(
  skillName: string,
  installPath: string,
  files: string[],
  warnings?: SecurityWarning[]
): string {
  if (warnings && warnings.length > 0) {
    let result = `Security warnings found for "${skillName}":\n\n`;
    for (const w of warnings) {
      result += `**${w.severity.toUpperCase()}**: ${w.file}:${w.line}\n`;
      result += `  ${w.description}\n\n`;
    }
    result += `Review these warnings carefully. To download anyway:\n`;
    result += `remote_download_skill("${skillName}", confirm_security=true)`;
    return result;
  }

  let result = `Downloaded "${skillName}" successfully!\n\n`;
  result += `Location: ${installPath}/\n`;
  result += `Files: ${files.join(', ')}\n\n`;
  result += `This skill is now available offline. You can:\n`;
  result += `- Use local_list_skills() to see all downloaded skills\n`;
  result += `- Use local_get_skill("${skillName}") to load it in future sessions without network\n`;
  result += `- The skill will be available for offline use\n\n`;
  result += `Note: You already have the skill knowledge from remote_get_skill - you can continue working!`;

  return result;
}

export function formatLocalSkillList(skills: LocalSkillInfo[]): string {
  if (skills.length === 0) {
    return 'No skills downloaded yet. Use remote_search_skills to find skills and remote_download_skill to download them.';
  }

  let result = `Downloaded skills (${skills.length}):\n\n`;

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    result += `${i + 1}. **${skill.name}**\n`;
    result += `   Location: ${skill.path}/\n`;
    result += `   Downloaded: ${formatDate(skill.downloadedAt)}\n\n`;
  }

  result += `Use local_get_skill(name) to load a skill's full content.`;

  return result;
}

export function formatLocalSkill(name: string, content: string, files: string[]): string {
  let result = `# ${name} (local)\n\n`;
  result += `## SKILL.md Content\n${content}\n\n`;
  result += `## Available Resource Files\n`;
  for (const file of files.filter(f => f !== 'SKILL.md').slice(0, 20)) {
    result += `- ${file}\n`;
  }
  if (files.length > 21) {
    result += `- ... and ${files.length - 21} more\n`;
  }
  result += `\nUse local_get_skill_resource("${name}", "path") to read a specific file.`;

  return result;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr || dateStr === 'unknown') return 'Unknown';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateStr;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
