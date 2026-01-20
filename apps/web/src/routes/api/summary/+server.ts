import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('skills_summary')
    .select('total_count, by_category, top_tags, computed_at')
    .eq('id', 1)
    .single();

  if (error) {
    return json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    }, { status: 500 });
  }

  return json({
    success: true,
    data: {
      total_count: data?.total_count || 0,
      by_category: data?.by_category || {},
      top_tags: data?.top_tags || [],
      computed_at: data?.computed_at,
    },
  });
};
