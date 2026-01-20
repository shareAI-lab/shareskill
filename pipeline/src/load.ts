// Database Load - Upsert single skill to Supabase + Upload resources to Storage

import { createSupabaseServiceClient } from '@shareskill/db';
import { config } from './config.js';
import type { ExtractedSkill } from './extract.js';
import type { FileContent } from './fetch.js';

let supabaseClient: ReturnType<typeof createSupabaseServiceClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseServiceClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return supabaseClient;
}

const LOAD_MAX_RETRIES = 3;
const LOAD_BASE_DELAY = 3000;

function isRetryableDbError(error: any): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('fetch failed') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('connection') ||
    message.includes('timeout')
  );
}

function buildDownloadUrl(repoUrl: string, defaultBranch: string, filePath: string): string {
  return `${repoUrl}/blob/${defaultBranch}/${filePath}`;
}

// Validate and sanitize data before DB insert
function validateAndSanitize(skill: ExtractedSkill): { valid: boolean; error?: string } {
  // Check required fields
  if (!skill.repoFullName || skill.repoFullName.length > 200) {
    return { valid: false, error: 'Invalid repo_full_name' };
  }
  if (!skill.name || skill.name.length > 500) {
    return { valid: false, error: 'Name too long (max 500)' };
  }
  if (!skill.description || skill.description.length > 5000) {
    return { valid: false, error: 'Description too long (max 5000)' };
  }
  if (skill.tagline && skill.tagline.length > 500) {
    return { valid: false, error: 'Tagline too long (max 500)' };
  }
  if (skill.searchText && skill.searchText.length > 10000) {
    return { valid: false, error: 'Search text too long (max 10000)' };
  }

  return { valid: true };
}

// Truncate strings to safe lengths
function truncateString(str: string | null | undefined, maxLen: number): string | null {
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export async function loadSingleSkill(skill: ExtractedSkill, embedding: number[]): Promise<void> {
  // Validate before insert
  const validation = validateAndSanitize(skill);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  const skillSlug =
    skill.skillPath
      ? skill.skillPath.split('/').pop()
      : skill.repoFullName.split('/')[1];

  const record = {
    // Identifiers
    repo_full_name: skill.repoFullName,
    skill_path: skill.skillPath || '',
    skill_slug: skillSlug,

    // Original frontmatter
    name: skill.name,
    description: skill.description,
    license: skill.license,
    compatibility: skill.compatibility,
    allowed_tools: skill.allowedTools,
    frontmatter: skill.frontmatter,

    // LLM enhanced
    tagline: skill.tagline,
    category: skill.category,
    tags: skill.tags,
    key_features: skill.keyFeatures,
    tech_stack: skill.techStack,

    // File structure
    file_tree: skill.fileTree,
    has_scripts: skill.hasScripts,
    has_references: skill.hasReferences,
    has_assets: skill.hasAssets,
    script_count: skill.scriptCount,
    total_files: skill.totalFiles,

    // Security
    security_warnings: skill.securityWarnings,
    security_analyzed_at: new Date().toISOString(),

    // GitHub metadata
    repo_url: skill.repoUrl,
    repo_stars: skill.repoStars,
    repo_pushed_at: skill.repoPushedAt,
    download_url: buildDownloadUrl(skill.repoUrl, skill.defaultBranch, skill.filePath),

    // Content
    skill_md_content: skill.skillMdContent,
    skill_md_sha: skill.sha,

    // Search
    search_text: skill.searchText,
    embedding_text: skill.embeddingText,
    embedding: embedding.length > 0 ? JSON.stringify(embedding) : null,
    embedding_model: embedding.length > 0 ? config.embeddingModelId : null,
    embedding_updated_at: embedding.length > 0 ? new Date().toISOString() : null,

    // Timestamps
    skill_updated_at: skill.repoPushedAt || new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= LOAD_MAX_RETRIES; attempt++) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('skills').upsert(record, {
        onConflict: 'repo_full_name,skill_path',
      });

      if (error) {
        throw new Error(`DB upsert failed: ${error.message}`);
      }
      return;
    } catch (error: any) {
      lastError = error;

      if (!isRetryableDbError(error) || attempt === LOAD_MAX_RETRIES) {
        throw error;
      }

      const delay = LOAD_BASE_DELAY * Math.pow(2, attempt - 1);
      console.warn(`  DB upsert for ${skill.repoFullName}: ${error.message}, retrying in ${delay / 1000}s (${attempt}/${LOAD_MAX_RETRIES})...`);

      supabaseClient = null;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// Extensions to pre-cache (code and documentation)
const PRE_CACHE_EXTENSIONS = new Set([
  'md', 'ts', 'js', 'mjs', 'cjs', 'tsx', 'jsx',
  'py', 'json', 'yaml', 'yml', 'sh', 'sql', 'txt',
  'xml', 'html', 'css', 'scss', 'less',
]);

function shouldPreCache(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return PRE_CACHE_EXTENSIONS.has(ext);
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  // Use standard MIME types that Supabase Storage accepts
  // All text files use text/plain for maximum compatibility
  const types: Record<string, string> = {
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    cjs: 'application/javascript',
    jsx: 'application/javascript',
    // All other text-based files use text/plain
    md: 'text/plain',
    ts: 'text/plain',
    tsx: 'text/plain',
    py: 'text/plain',
    yaml: 'text/plain',
    yml: 'text/plain',
    sh: 'text/plain',
    sql: 'text/plain',
    txt: 'text/plain',
    scss: 'text/plain',
    less: 'text/plain',
  };
  return types[ext] || 'text/plain';
}

export async function uploadResourcesToStorage(
  skillKey: string,
  files: FileContent[]
): Promise<{ uploaded: number; skipped: number; failed: number }> {
  const supabase = getSupabase();

  // Filter files to pre-cache
  const filesToUpload = files.filter((f) => shouldPreCache(f.path));
  const skipped = files.length - filesToUpload.length;

  if (filesToUpload.length === 0) {
    return { uploaded: 0, skipped, failed: 0 };
  }

  // Parallel upload with concurrency of 5
  const UPLOAD_CONCURRENCY = 5;
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < filesToUpload.length; i += UPLOAD_CONCURRENCY) {
    const batch = filesToUpload.slice(i, i + UPLOAD_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (file) => {
        const storagePath = `${skillKey}/${file.path}`;
        const contentType = getContentType(file.path);

        try {
          const { error } = await supabase.storage
            .from('skill-resources')
            .upload(storagePath, file.content, {
              contentType,
              upsert: true,
            });

          if (error && !error.message.includes('already exists')) {
            return { success: false, path: storagePath, error: error.message };
          }
          return { success: true };
        } catch (err: any) {
          return { success: false, path: storagePath, error: err.message };
        }
      })
    );

    for (const result of results) {
      if (result.success) {
        uploaded++;
      } else {
        failed++;
      }
    }
  }

  return { uploaded, skipped, failed };
}

