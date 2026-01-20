import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const supabase = getSupabase();

  const { data: categories, error: catError } = await supabase
    .from('skill_categories')
    .select('key, label, hint, sort_order')
    .order('sort_order');

  if (catError) {
    return json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: catError.message },
    }, { status: 500 });
  }

  // Use skills_summary for accurate counts (pre-computed)
  const { data: summary, error: summaryError } = await supabase
    .from('skills_summary')
    .select('by_category')
    .eq('id', 1)
    .single();

  if (summaryError) {
    return json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: summaryError.message },
    }, { status: 500 });
  }

  const countMap = (summary?.by_category || {}) as Record<string, number>;

  const items = (categories || []).map(cat => ({
    key: cat.key,
    label: cat.label,
    hint: cat.hint,
    count: countMap[cat.key] || 0,
  }));

  return json({
    success: true,
    data: { categories: items },
  });
};
