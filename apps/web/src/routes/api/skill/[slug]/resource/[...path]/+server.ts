import type { RequestHandler } from './$types';
import { error, text } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSupabase } from '$lib/server/db';

// File extension to content type mapping
const CONTENT_TYPES: Record<string, string> = {
  md: 'text/markdown; charset=utf-8',
  ts: 'text/typescript; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  cjs: 'text/javascript; charset=utf-8',
  tsx: 'text/typescript; charset=utf-8',
  jsx: 'text/javascript; charset=utf-8',
  py: 'text/x-python; charset=utf-8',
  json: 'application/json; charset=utf-8',
  yaml: 'text/yaml; charset=utf-8',
  yml: 'text/yaml; charset=utf-8',
  sh: 'text/x-sh; charset=utf-8',
  sql: 'text/x-sql; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  scss: 'text/x-scss; charset=utf-8',
  less: 'text/x-less; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export const GET: RequestHandler = async ({ params }) => {
  const supabase = getSupabase();
  const slug = decodeURIComponent(params.slug);
  const resourcePath = params.path;

  if (!resourcePath) {
    throw error(400, 'Resource path is required');
  }

  // Get skill info
  const { data: skill, error: skillErr } = await supabase
    .from('skills')
    .select('id, skill_key, skill_path, repo_full_name, file_tree')
    .or(`skill_slug.eq.${slug},skill_key.eq.${slug}`)
    .single();

  if (skillErr || !skill) {
    throw error(404, 'Skill not found');
  }

  // Validate file exists in file_tree
  const fileEntry = (skill.file_tree ?? []).find(
    (f: any) => f.path === resourcePath && f.type === 'file'
  );

  if (!fileEntry) {
    throw error(404, 'Resource not found in skill package');
  }

  // Try to get from Supabase Storage first
  const storagePath = `${skill.skill_key}/${resourcePath}`;
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('skill-resources')
    .download(storagePath);

  if (!storageErr && storageData) {
    // Record access for hot caching analytics
    recordAccess(supabase, skill.id, resourcePath).catch(() => {});

    const contentType = getContentType(resourcePath);
    const content = await storageData.text();
    return text(content, {
      headers: { 'Content-Type': contentType },
    });
  }

  // Fallback to GitHub
  const githubUrl = `https://raw.githubusercontent.com/${skill.repo_full_name}/HEAD/${skill.skill_path}/${resourcePath}`;

  try {
    const response = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'ShareSkill/1.0',
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const content = await response.text();
    const contentType = getContentType(resourcePath);

    // Hot cache to Storage (async, don't block response)
    cacheToStorage(supabase, skill.skill_key, resourcePath, content).catch(() => {});

    // Record access
    recordAccess(supabase, skill.id, resourcePath).catch(() => {});

    return text(content, {
      headers: { 'Content-Type': contentType },
    });
  } catch (e) {
    // Return fallback URL for client-side retry
    throw error(502, {
      message: 'Failed to fetch resource from GitHub',
      // @ts-ignore - custom error data
      fallback_url: githubUrl,
    });
  }
};

async function cacheToStorage(
  supabase: any,
  skillKey: string,
  resourcePath: string,
  content: string
): Promise<void> {
  const storagePath = `${skillKey}/${resourcePath}`;
  await supabase.storage
    .from('skill-resources')
    .upload(storagePath, content, {
      contentType: getContentType(resourcePath),
      upsert: true,
    });
}

async function recordAccess(
  supabase: any,
  skillId: number,
  filePath: string
): Promise<void> {
  await supabase
    .from('resource_access_stats')
    .upsert(
      {
        skill_id: skillId,
        file_path: filePath,
        access_count: 1,
        last_accessed_at: new Date().toISOString(),
      },
      {
        onConflict: 'skill_id,file_path',
        ignoreDuplicates: false,
      }
    )
    .then(() => {
      // Increment access count
      return supabase.rpc('increment_resource_access', {
        p_skill_id: skillId,
        p_file_path: filePath,
      });
    });
}
