import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';

export const load: PageServerLoad = async () => {
  const supabase = getSupabase();

  // Get basic stats
  const { count: totalSkills } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true });

  const { data: repoData } = await supabase
    .from('skills')
    .select('repo_full_name')
    .limit(10000);
  const totalRepos = new Set(repoData?.map(r => r.repo_full_name) || []).size;

  const { count: featuredCount } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true);

  const { count: flaggedCount } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })
    .eq('is_flagged', true);

  const { count: totalSearches } = await supabase
    .from('search_logs')
    .select('*', { count: 'exact', head: true });

  const { count: totalEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  // Get category distribution from skills_summary
  const { data: summaryData } = await supabase
    .from('skills_summary')
    .select('by_category')
    .single();

  // Get high risk skills
  const { data: highRiskSkills } = await supabase.rpc('get_high_risk_skills', { limit_count: 10 });

  // Get top searches
  const { data: topSearches } = await supabase.rpc('get_top_searches', { limit_count: 10, hours: 168 });

  // Get featured skills
  const { data: featuredSkills } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name')
    .eq('is_featured', true)
    .order('repo_stars', { ascending: false })
    .limit(10);

  // Count warnings by severity
  const { data: allSkillsWarnings } = await supabase
    .from('skills')
    .select('security_warnings')
    .not('security_warnings', 'eq', '[]');

  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  (allSkillsWarnings || []).forEach((skill: any) => {
    const warnings = skill.security_warnings || [];
    warnings.forEach((w: any) => {
      if (w.severity === 'high') highCount++;
      else if (w.severity === 'medium') mediumCount++;
      else if (w.severity === 'low') lowCount++;
    });
  });

  return {
    stats: {
      total_skills: totalSkills || 0,
      total_repos: totalRepos,
      featured_count: featuredCount || 0,
      flagged_count: flaggedCount || 0,
      total_searches: totalSearches || 0,
      total_events: totalEvents || 0,
    },
    category_distribution: summaryData?.by_category || {},
    warning_distribution: {
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      none: (totalSkills || 0) - (allSkillsWarnings?.length || 0),
    },
    high_risk_skills: highRiskSkills || [],
    top_searches: topSearches || [],
    featured_skills: featuredSkills || [],
  };
};
