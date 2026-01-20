import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';
import type { SkillDetail, SkillListItem, SecurityWarning } from '@shareskill/shared';

export const GET: RequestHandler = async ({ params }) => {
  const supabase = getSupabase();
  const slug = decodeURIComponent(params.slug);

  const { data: row, error: err } = await supabase
    .from('skills')
    .select('*')
    .eq('skill_slug', slug)
    .single();

  if (err || !row) {
    // Try by skill_key if slug didn't work
    const { data: rowByKey, error: errByKey } = await supabase
      .from('skills')
      .select('*')
      .eq('skill_key', slug)
      .single();

    if (errByKey || !rowByKey) {
      throw error(404, 'Skill not found');
    }

    return buildResponse(supabase, rowByKey);
  }

  return buildResponse(supabase, row);
};

async function buildResponse(supabase: any, row: any) {
  const securityWarnings: SecurityWarning[] = (row.security_warnings ?? []).map((w: any) => ({
    file: w.file,
    line: w.line ?? 0,
    severity: w.severity ?? 'medium',
    description: w.description,
    code_snippet: w.code_snippet,
  }));

  const skill: SkillDetail = {
    id: row.id,
    skill_key: row.skill_key,
    skill_slug: row.skill_slug,
    skill_path: row.skill_path,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    key_features: row.key_features ?? [],
    tech_stack: row.tech_stack ?? [],
    license: row.license,
    compatibility: row.compatibility,
    allowed_tools: row.allowed_tools ?? [],
    file_tree: row.file_tree ?? [],
    has_scripts: row.has_scripts ?? false,
    has_references: row.has_references ?? false,
    script_count: row.script_count ?? 0,
    total_files: row.total_files ?? 0,
    security_warnings: securityWarnings,
    repo_full_name: row.repo_full_name,
    repo_url: row.repo_url,
    repo_stars: row.repo_stars,
    repo_pushed_at: row.repo_pushed_at,
    download_url: row.download_url,
    skill_md_content: row.skill_md_content,
    skill_updated_at: row.skill_updated_at,
  };

  // Query related skills using embedding similarity
  const { data: relatedData } = await supabase
    .rpc('match_skills_by_embedding', {
      query_embedding: row.embedding,
      match_threshold: 0.3,
      match_count: 6,
      exclude_id: row.id,
    });

  const related: SkillListItem[] = (relatedData ?? []).map((r: any) => ({
    id: r.id,
    skill_key: r.skill_key,
    skill_slug: r.skill_slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    category: r.category,
    tags: r.tags ?? [],
    key_features: r.key_features ?? [],
    repo_full_name: r.repo_full_name,
    repo_stars: r.repo_stars,
    repo_pushed_at: r.repo_pushed_at,
  }));

  skill.related = related;

  // Query same-repo skills
  const { data: sameRepoData } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at')
    .eq('repo_full_name', row.repo_full_name)
    .neq('id', row.id)
    .order('skill_slug', { ascending: true })
    .limit(20);

  const sameRepo: SkillListItem[] = (sameRepoData ?? []).map((r: any) => ({
    id: r.id,
    skill_key: r.skill_key,
    skill_slug: r.skill_slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    category: r.category,
    tags: r.tags ?? [],
    key_features: r.key_features ?? [],
    repo_full_name: r.repo_full_name,
    repo_stars: r.repo_stars,
    repo_pushed_at: r.repo_pushed_at,
  }));

  skill.same_repo = sameRepo;

  return json({
    success: true,
    data: skill,
  });
}
