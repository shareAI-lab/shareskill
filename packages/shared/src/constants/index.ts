export const CATEGORIES = [
  // Development & Engineering
  { key: 'coding', label: 'Coding', hint: 'Writing, reviewing, refactoring code', sort_order: 10 },
  { key: 'devops', label: 'DevOps', hint: 'CI/CD, deployment, infrastructure', sort_order: 20 },
  { key: 'testing', label: 'Testing', hint: 'QA, unit tests, validation', sort_order: 30 },
  { key: 'security', label: 'Security', hint: 'Auth, auditing, vulnerability', sort_order: 40 },

  // Data & AI
  { key: 'data', label: 'Data', hint: 'Analysis, visualization, ETL', sort_order: 50 },
  { key: 'ai', label: 'AI & Agents', hint: 'LLM, prompts, automation agents', sort_order: 60 },

  // Design & Creative
  { key: 'design', label: 'Design', hint: 'UI/UX, graphics, visual assets', sort_order: 70 },
  { key: 'writing', label: 'Writing', hint: 'Copywriting, editing, storytelling', sort_order: 80 },
  { key: 'media', label: 'Media', hint: 'Video, audio, image processing', sort_order: 90 },

  // Business & Operations
  { key: 'business', label: 'Business', hint: 'Strategy, planning, analysis', sort_order: 100 },
  { key: 'marketing', label: 'Marketing', hint: 'SEO, ads, social media, growth', sort_order: 110 },
  { key: 'sales', label: 'Sales', hint: 'CRM, outreach, proposals', sort_order: 120 },
  { key: 'finance', label: 'Finance', hint: 'Accounting, budgeting, invoicing', sort_order: 130 },

  // Productivity & Communication
  { key: 'productivity', label: 'Productivity', hint: 'Workflows, automation, efficiency', sort_order: 140 },
  { key: 'communication', label: 'Communication', hint: 'Email, meetings, presentations', sort_order: 150 },
  { key: 'research', label: 'Research', hint: 'Information gathering, synthesis', sort_order: 160 },

  // Domain-Specific
  { key: 'education', label: 'Education', hint: 'Teaching, learning, tutoring', sort_order: 170 },

  // Catch-all
  { key: 'other', label: 'Other', hint: 'Miscellaneous', sort_order: 999 },
] as const;

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const API_BASE_URL = 'https://shareskill.run/api';

export const LOCAL_STORAGE_PATH = '.shareskill';
export const SKILLS_DIR = 'skills';
export const CONFIG_FILE = 'config.json';

export const MCP_SERVER_PORT = 3001;

export const EMBEDDING_MODEL = 'text-embedding-3-large';
export const EMBEDDING_DIMENSIONS = 1536;

export const LLM_MODEL = 'gemini-3-flash-preview';

export const AGENT_CONFIGS = {
  claude_code: {
    name: 'Claude Code',
    config_path: '~/.claude/settings.json',
    skill_path: '~/.claude/skills/',
  },
  cursor: {
    name: 'Cursor',
    config_path: '~/.cursor/mcp.json',
    skill_path: '~/.cursor/skills/',
  },
  codex: {
    name: 'Codex',
    config_path: '~/.codex/config.json',
    skill_path: '~/.codex/skills/',
  },
  opencode: {
    name: 'OpenCode',
    config_path: '~/.config/opencode/config.json',
    skill_path: '~/.config/opencode/skills/',
  },
  antigravity: {
    name: 'Antigravity',
    config_path: '~/.gemini/config.json',
    skill_path: '~/.gemini/skills/',
  },
} as const;

export type AgentType = keyof typeof AGENT_CONFIGS;

export const SEARCH_DEFAULTS = {
  limit: 20,
  max_limit: 50,
  semantic: true,
  sort: 'relevance' as const,
};
