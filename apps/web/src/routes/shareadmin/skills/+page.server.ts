import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
  const supabase = getSupabase();

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const featured = url.searchParams.get('featured');
  const flagged = url.searchParams.get('flagged');
  const hasWarnings = url.searchParams.get('has_warnings');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, tagline, category, repo_full_name, repo_stars, security_warnings, is_featured, is_flagged, flag_reason, created_at', { count: 'exact' });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,skill_slug.ilike.%${search}%,repo_full_name.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (featured === 'true') {
    query = query.eq('is_featured', true);
  }
  if (flagged === 'true') {
    query = query.eq('is_flagged', true);
  }
  if (hasWarnings === 'true') {
    query = query.not('security_warnings', 'eq', '[]');
  }

  // Order and paginate
  query = query
    .order('repo_stars', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: skills, count, error } = await query;

  // Get categories for filter
  const { data: categories } = await supabase
    .from('skill_categories')
    .select('key, label')
    .order('sort_order');

  // Process skills to add warning counts
  const processedSkills = (skills || []).map((skill: any) => {
    const warnings = skill.security_warnings || [];
    const highCount = warnings.filter((w: any) => w.severity === 'high').length;
    return {
      ...skill,
      warning_count: warnings.length,
      high_warning_count: highCount,
    };
  });

  return {
    skills: processedSkills,
    categories: categories || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
    filters: {
      search,
      category,
      featured: featured === 'true',
      flagged: flagged === 'true',
      hasWarnings: hasWarnings === 'true',
    },
  };
};
