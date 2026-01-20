import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSupabase } from '$lib/server/db';

interface PackageFile {
  path: string;
  content: string;
}

export const GET: RequestHandler = async ({ params }) => {
  const supabase = getSupabase();
  const slug = decodeURIComponent(params.slug);

  // Get skill info
  const { data: skill, error: skillErr } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, skill_path, name, repo_full_name, repo_pushed_at, file_tree, skill_md_content')
    .or(`skill_slug.eq.${slug},skill_key.eq.${slug}`)
    .single();

  if (skillErr || !skill) {
    throw error(404, 'Skill not found');
  }

  const files: PackageFile[] = [];
  const warnings: string[] = [];

  // Get all files from file_tree
  const fileEntries = (skill.file_tree ?? []).filter((f: any) => f.type === 'file');

  // Fetch all files concurrently
  const filePromises = fileEntries.map(async (fileEntry: any) => {
    const content = await getFileContent(
      supabase,
      skill.skill_key,
      skill.repo_full_name,
      skill.skill_path,
      fileEntry.path
    );

    if (content === null) {
      warnings.push(`Failed to fetch: ${fileEntry.path}`);
      return null;
    }

    return {
      path: fileEntry.path,
      content,
    };
  });

  const results = await Promise.all(filePromises);

  for (const result of results) {
    if (result) {
      files.push(result);
    }
  }

  return json({
    success: true,
    data: {
      skill_key: skill.skill_key,
      name: skill.name,
      version: skill.repo_pushed_at,
      files,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
  });
};

async function getFileContent(
  supabase: any,
  skillKey: string,
  repoFullName: string,
  skillPath: string,
  filePath: string
): Promise<string | null> {
  // Try Storage first
  const storagePath = `${skillKey}/${filePath}`;
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('skill-resources')
    .download(storagePath);

  if (!storageErr && storageData) {
    return await storageData.text();
  }

  // Fallback to GitHub
  const githubUrl = `https://raw.githubusercontent.com/${repoFullName}/HEAD/${skillPath}/${filePath}`;

  try {
    const response = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'ShareSkill/1.0',
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    const content = await response.text();

    // Hot cache to Storage (async)
    supabase.storage
      .from('skill-resources')
      .upload(storagePath, content, { upsert: true })
      .catch(() => {});

    return content;
  } catch {
    return null;
  }
}
