import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';
import { SEARCH_DEFAULTS, CATEGORIES, type SkillListItem } from '@shareskill/shared';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
  const supabase = getSupabase();
  const categoryKey = params.slug;

  const category = CATEGORIES.find(c => c.key === categoryKey);
  if (!category) {
    throw error(404, 'Category not found');
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const sort = (url.searchParams.get('sort') || 'stars') as 'latest' | 'stars';
  const limit = SEARCH_DEFAULTS.limit;
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at, translations', { count: 'exact' })
    .eq('category', categoryKey);

  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('repo_pushed_at', { ascending: false, nullsFirst: false });
  } else {
    queryBuilder = queryBuilder.order('repo_stars', { ascending: false, nullsFirst: false });
  }

  const [skillsResult, categoryResult] = await Promise.all([
    queryBuilder.range(offset, offset + limit - 1),
    supabase.from('skill_categories').select('key, label, hint, translations').eq('key', categoryKey).single(),
  ]);

  const items: (SkillListItem & { translations?: Record<string, any> })[] = (skillsResult.data ?? []).map((row: any) => ({
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

  const total = skillsResult.count ?? 0;
  const categoryWithTranslations = {
    ...category,
    translations: categoryResult.data?.translations ?? undefined,
  };

  return {
    category: categoryWithTranslations,
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    sort,
  };
};
