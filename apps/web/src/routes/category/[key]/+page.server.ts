import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';
import { CATEGORIES, SEARCH_DEFAULTS, type SkillListItem } from '@shareskill/shared';

export const load: PageServerLoad = async ({ params, url }) => {
  const supabase = getSupabase();
  const categoryKey = params.key;

  const category = CATEGORIES.find((c) => c.key === categoryKey);
  if (!category) {
    throw error(404, 'Category not found');
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const sort = (url.searchParams.get('sort') || 'stars') as 'latest' | 'stars';
  const limit = SEARCH_DEFAULTS.limit;
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('skills')
    .select(
      'id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at, translations',
      { count: 'exact' }
    )
    .eq('category', categoryKey);

  if (sort === 'latest') {
    queryBuilder = queryBuilder.order('repo_pushed_at', { ascending: false, nullsFirst: false });
  } else {
    queryBuilder = queryBuilder.order('repo_stars', { ascending: false });
  }

  const { data, count } = await queryBuilder.range(offset, offset + limit - 1);

  const items: (SkillListItem & { translations?: Record<string, any> })[] = (data ?? []).map((row: any) => ({
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

  const total = count ?? 0;

  return {
    category,
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
