// ShareSkill MCP Server with 8 tools (remote_* / local_*)

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  searchSkills,
  getSkillDetail,
  getSkillResource,
  getSkillPackage,
} from './api.js';
import {
  listLocalSkills,
  getLocalSkill,
  getLocalSkillResource,
  saveLocalSkill,
  removeLocalSkill,
} from '../store/skills.js';
import {
  TOOL_DEFINITIONS,
  formatSearchResults,
  formatSkillDetail,
  formatDownloadResult,
  formatLocalSkillList,
  formatLocalSkill,
} from './tools.js';

const server = new Server(
  {
    name: 'shareskill',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOL_DEFINITIONS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ===== Remote Tools =====
      case 'remote_search_skills': {
        const { query, category, limit } = args as {
          query: string;
          category?: string;
          limit?: number;
        };
        const results = await searchSkills(query, {
          category,
          limit: Math.min(limit || 5, 10),
        });
        return {
          content: [{ type: 'text', text: formatSearchResults(results, query) }],
        };
      }

      case 'remote_get_skill': {
        const { skill_key } = args as { skill_key: string };
        const skill = await getSkillDetail(skill_key);
        return {
          content: [{ type: 'text', text: formatSkillDetail(skill) }],
        };
      }

      case 'remote_get_skill_resource': {
        const { skill_key, resource_path } = args as {
          skill_key: string;
          resource_path: string;
        };
        const content = await getSkillResource(skill_key, resource_path);
        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'remote_download_skill': {
        const { skill_key, confirm_security } = args as {
          skill_key: string;
          confirm_security?: boolean;
        };

        // Get skill detail to check security warnings
        const skill = await getSkillDetail(skill_key);

        if (skill.security_warnings.length > 0 && !confirm_security) {
          return {
            content: [
              {
                type: 'text',
                text: formatDownloadResult(
                  skill.name,
                  '',
                  [],
                  skill.security_warnings
                ),
              },
            ],
          };
        }

        // Download package
        const pkg = await getSkillPackage(skill_key);
        const installPath = saveLocalSkill(pkg);

        return {
          content: [
            {
              type: 'text',
              text: formatDownloadResult(
                pkg.name,
                installPath,
                pkg.files.map((f) => f.path)
              ),
            },
          ],
        };
      }

      // ===== Local Tools =====
      case 'local_list_skills': {
        const skills = listLocalSkills();
        return {
          content: [{ type: 'text', text: formatLocalSkillList(skills) }],
        };
      }

      case 'local_get_skill': {
        const { name: skillName } = args as { name: string };
        const skill = getLocalSkill(skillName);

        if (!skill) {
          return {
            content: [
              {
                type: 'text',
                text: `Skill "${skillName}" not found locally. Use local_list_skills() to see available skills.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: formatLocalSkill(skillName, skill.content, skill.files),
            },
          ],
        };
      }

      case 'local_get_skill_resource': {
        const { name: skillName, resource_path } = args as {
          name: string;
          resource_path: string;
        };
        const content = getLocalSkillResource(skillName, resource_path);

        if (content === null) {
          return {
            content: [
              {
                type: 'text',
                text: `Resource "${resource_path}" not found in skill "${skillName}".`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'local_remove_skill': {
        const { name: skillName } = args as { name: string };
        const removed = removeLocalSkill(skillName);

        if (!removed) {
          return {
            content: [
              {
                type: 'text',
                text: `Skill "${skillName}" not found locally.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Removed "${skillName}" from local storage.`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message || 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
});

export function startMcpServer(): void {
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.error('ShareSkill MCP Server running on stdio');
}
