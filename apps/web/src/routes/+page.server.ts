import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';
import { CATEGORIES, type SkillCategory, type SkillsSummary, type SkillListItem } from '@shareskill/shared';

export const load: PageServerLoad = async () => {
  const supabase = getSupabase();
  const [summaryResult, featuredResult, categoriesResult] = await Promise.all([
    supabase.from('skills_summary').select('*').eq('id', 1).single(),
    supabase
      .from('skills')
      .select('id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at, translations')
      .order('repo_stars', { ascending: false })
      .limit(6),
    supabase.from('skill_categories').select('key, label, hint, sort_order, translations'),
  ]);

  const summary: SkillsSummary = summaryResult.data ?? {
    total_count: 0,
    by_category: {},
    top_tags: [],
    computed_at: new Date().toISOString(),
  };

  // Build categories with translations from database
  const dbCategories = categoriesResult.data ?? [];
  const dbCategoryMap = new Map(dbCategories.map(c => [c.key, c]));

  const categories: (SkillCategory & { translations?: Record<string, { label: string; hint: string }> })[] = CATEGORIES.map((cat) => {
    const dbCat = dbCategoryMap.get(cat.key);
    return {
      ...cat,
      count: (summary.by_category as Record<string, number>)[cat.key] ?? 0,
      translations: dbCat?.translations ?? undefined,
    };
  }).sort((a, b) => a.sort_order - b.sort_order);

  const featured: (SkillListItem & { translations?: Record<string, any> })[] = (featuredResult.data ?? []).map((row: any) => ({
    id: row.id,
    skill_key: row.skill_key,
    skill_slug: row.skill_slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    key_features: row.key_features ?? [],
    repo_full_name: row.repo_full_name,
    repo_stars: row.repo_stars,
    repo_pushed_at: row.repo_pushed_at,
    translations: row.translations ?? undefined,
  }));

  return {
    summary,
    categories,
    featured,
  };
};
