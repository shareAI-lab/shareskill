import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';
import { createEmbedding } from '$lib/server/embedding';
import { SEARCH_DEFAULTS } from '@shareskill/shared';

export const GET: RequestHandler = async ({ url }) => {
  const supabase = getSupabase();
  const query = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || undefined;
  const sort = url.searchParams.get('sort') || 'relevance';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(
    SEARCH_DEFAULTS.max_limit,
    parseInt(url.searchParams.get('limit') || String(SEARCH_DEFAULTS.limit))
  );
  const offset = (page - 1) * limit;
  const useSemantic = url.searchParams.get('semantic') !== 'false';

  if (!query) {
    return json({
      success: false,
      error: { code: 'INVALID_QUERY', message: "Query parameter 'q' is required" },
    }, { status: 400 });
  }

  try {
    let items: any[] = [];
    let total = 0;

    if (useSemantic && sort === 'relevance') {
      const embedding = await createEmbedding(query);

      const { data, error } = await supabase.rpc('match_skills_by_embedding', {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: limit + offset,
        category_filter: category || null,
      });

      if (error) {
        console.error('Semantic search error:', error);
        throw error;
      }

      items = (data || []).slice(offset, offset + limit).map((row: any) => ({
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
        similarity: row.similarity,
      }));

      total = data?.length || 0;
    } else {
      let queryBuilder = supabase
        .from('skills')
        .select('id, skill_key, skill_slug, name, tagline, description, tags, key_features, category, repo_full_name, repo_stars, repo_pushed_at', { count: 'exact' })
        .or(`tagline.ilike.%${query}%,description.ilike.%${query}%,search_text.ilike.%${query}%`);

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      if (sort === 'latest') {
        queryBuilder = queryBuilder.order('repo_pushed_at', { ascending: false, nullsFirst: false });
      } else if (sort === 'stars') {
        queryBuilder = queryBuilder.order('repo_stars', { ascending: false });
      } else {
        queryBuilder = queryBuilder.order('repo_stars', { ascending: false });
      }

      const { data, count, error } = await queryBuilder.range(offset, offset + limit - 1);

      if (error) throw error;

      items = (data ?? []).map((row) => ({
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
      }));

      total = count ?? 0;
    }

    return json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
        search_type: useSemantic && sort === 'relevance' ? 'semantic' : 'keyword',
      },
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    }, { status: 500 });
  }
};
