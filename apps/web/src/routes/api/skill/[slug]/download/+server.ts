import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSupabase } from '$lib/server/db';
import JSZip from 'jszip';

export const GET: RequestHandler = async ({ params }) => {
  const supabase = getSupabase();
  const slug = decodeURIComponent(params.slug);

  // Get skill info
  const { data: skill, error: skillErr } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, skill_path, name, repo_full_name, file_tree')
    .or(`skill_slug.eq.${slug},skill_key.eq.${slug}`)
    .single();

  if (skillErr || !skill) {
    throw error(404, 'Skill not found');
  }

  const zip = new JSZip();
  const folder = zip.folder(skill.skill_slug || skill.name);

  if (!folder) {
    throw error(500, 'Failed to create zip folder');
  }

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

    if (content !== null) {
      folder.file(fileEntry.path, content);
    }
  });

  await Promise.all(filePromises);

  const zipContent = await zip.generateAsync({ type: 'arraybuffer' });
  const filename = `${skill.skill_slug || skill.name}.zip`;

  return new Response(zipContent, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
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
