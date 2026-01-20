import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';
import type { SkillDetail, SkillListItem, SecurityWarning } from '@shareskill/shared';

export const load: PageServerLoad = async ({ params }) => {
  const supabase = getSupabase();
  const slug = decodeURIComponent(params.slug);

  const { data: row, error: err } = await supabase
    .from('skills')
    .select('*')
    .eq('skill_key', slug)
    .single();

  if (err || !row) {
    throw error(404, 'Skill not found');
  }

  const securityWarnings: SecurityWarning[] = (row.security_warnings ?? []).map((w: any) => ({
    file: w.file,
    line: w.line ?? 0,
    severity: w.severity ?? 'medium',
    type: w.type ?? 'other',
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
    translations: row.translations ?? {},
  };

  // Query related skills using embedding similarity (pgvector cosine distance)
  // Use raw SQL to pass embedding directly since Supabase JS serializes vector incorrectly
  const { data: relatedData } = await supabase
    .rpc('get_related_skills', {
      skill_id: row.id,
      match_threshold: 0.3,
      match_count: 6,
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
    translations: r.translations ?? {},
  }));

  skill.related = related;

  // Query same-repo skills (other skills from the same repository)
  const { data: sameRepoData } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at, translations')
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
    translations: r.translations ?? {},
  }));

  skill.same_repo = sameRepo;

  return { skill };
};
