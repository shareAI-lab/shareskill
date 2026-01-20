// Pipeline Configuration
// Centralizes all environment variables and defaults
// Supports multiple LLM providers: openai, deepseek, gemini, ollama, claude

function getEnvStr(key: string, defaultValue = ''): string {
  return process.env[key] || defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const val = process.env[key];
  return val ? parseFloat(val) : defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (!val) return defaultValue;
  return val === '1' || val.toLowerCase() === 'true';
}

export type LLMProvider = 'openai' | 'deepseek' | 'gemini' | 'ollama' | 'claude';

export interface LLMConfig {
  id: string;
  url: string;
  apiKey: string;
}

const llmConfigs: Record<LLMProvider, LLMConfig> = {
  openai: {
    id: getEnvStr('OPENAI_MODEL_ID', 'gpt-4o-mini'),
    url: getEnvStr('OPENAI_API_URL', 'https://api.openai.com/v1'),
    apiKey: getEnvStr('OPENAI_API_KEY'),
  },
  deepseek: {
    id: getEnvStr('DEEPSEEK_MODEL_ID', 'deepseek-chat'),
    url: getEnvStr('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1'),
    apiKey: getEnvStr('DEEPSEEK_API_KEY'),
  },
  gemini: {
    id: getEnvStr('GEMINI_MODEL_ID', 'gemini-2.0-flash'),
    url: getEnvStr('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models'),
    apiKey: getEnvStr('GEMINI_API_KEY'),
  },
  ollama: {
    id: getEnvStr('OLLAMA_MODEL_ID', 'llama3.1'),
    url: getEnvStr('OLLAMA_API_URL', 'http://127.0.0.1:11434/api/chat'),
    apiKey: getEnvStr('OLLAMA_API_KEY', ''),
  },
  claude: {
    id: getEnvStr('CLAUDE_MODEL_ID', 'claude-sonnet-4-5-20250929'),
    url: getEnvStr('CLAUDE_API_URL', 'https://api.anthropic.com/v1/messages'),
    apiKey: getEnvStr('CLAUDE_API_KEY'),
  },
};

export const config = {
  // GitHub Tokens (comma-separated for token pool)
  githubTokens: getEnvStr('GITHUB_TOKENS', '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),

  // Supabase
  supabaseUrl: getEnvStr('SUPABASE_URL'),
  supabaseServiceKey: getEnvStr('SUPABASE_SERVICE_KEY'),

  // LLM Configuration
  currentModel: getEnvStr('CURRENT_MODEL', 'openai') as LLMProvider,
  llmConfigs,
  llmMaxConcurrent: getEnvInt('LLM_MAX_CONCURRENT', 10),
  llmRequestInterval: getEnvFloat('LLM_REQUEST_INTERVAL', 0),
  llmTaskTimeout: getEnvInt('LLM_TASK_TIMEOUT', 60),

  // OpenAI Embeddings
  openaiApiKey: getEnvStr('OPENAI_API_KEY'),
  openaiApiUrl: getEnvStr('OPENAI_API_URL', 'https://api.openai.com/v1'),
  embeddingModelId: getEnvStr('EMBEDDING_MODEL_ID', 'text-embedding-3-large'),
  embeddingDimensions: getEnvInt('EMBEDDING_DIMENSIONS', 1536),
  embeddingMaxConcurrent: getEnvInt('EMBEDDING_MAX_CONCURRENT', 10),
  embeddingEnabled: getEnvBool('EMBEDDING_ENABLED', true),
  embeddingInputMaxChars: getEnvInt('EMBEDDING_INPUT_MAX_CHARS', 8000),

  // Discovery settings
  startPushedDate: getEnvStr('START_PUSHED_DATE', ''),
  baseFilters: getEnvStr('BASE_FILTERS', 'fork:false archived:false stars:>=1'),

  // Processing limits
  devRepoLimit: getEnvInt('DEV_REPO_LIMIT', 0),
  devSkillLimit: getEnvInt('DEV_SKILL_LIMIT', 0),
  maxSkillsPerRepo: getEnvInt('MAX_SKILLS_PER_REPO', 50),
  skillMdMaxBytes: getEnvInt('SKILL_MD_MAX_BYTES', 90000),
  repoSizeMaxKb: getEnvInt('REPO_SIZE_MAX_KB', 80000),
  repoConcurrent: getEnvInt('REPO_CONCURRENT', 10),
  skillConcurrent: getEnvInt('SKILL_CONCURRENT', 5), // Process N skills in parallel

  // Retry settings
  maxRetries: getEnvInt('MAX_RETRIES', 3),
  retryDelay: getEnvInt('RETRY_DELAY', 5),

  // Force reprocess all
  forceAnalyzeAll: getEnvBool('FORCE_ANALYZE_ALL', false),

  // Text limits
  searchTextMaxChars: getEnvInt('SEARCH_TEXT_MAX_CHARS', 4000),
  analysisMaxChars: getEnvInt('ANALYSIS_MAX_CHARS', 8000),

  // Get current LLM config
  get llmConfig(): LLMConfig {
    return llmConfigs[this.currentModel];
  },
} as const;

export type Config = typeof config;
