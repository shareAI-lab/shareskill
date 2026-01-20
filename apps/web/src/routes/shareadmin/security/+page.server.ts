import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';

export const load: PageServerLoad = async () => {
  const supabase = getSupabase();

  // Get high risk skills
  const { data: highRiskSkills } = await supabase.rpc('get_high_risk_skills', { limit_count: 50 });

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

  const { count: totalSkills } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true });

  // Get recently added skills (last 24 hours)
  const { data: recentSkills } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, security_warnings, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  // Process recent skills to add warning counts
  const processedRecent = (recentSkills || []).map((skill: any) => {
    const warnings = skill.security_warnings || [];
    return {
      ...skill,
      warning_count: warnings.length,
      high_warning_count: warnings.filter((w: any) => w.severity === 'high').length,
    };
  });

  // Get flagged skills
  const { data: flaggedSkills } = await supabase
    .from('skills')
    .select('id, skill_key, skill_slug, name, flag_reason, flagged_at')
    .eq('is_flagged', true)
    .order('flagged_at', { ascending: false })
    .limit(20);

  return {
    warning_distribution: {
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      none: (totalSkills || 0) - (allSkillsWarnings?.length || 0),
    },
    high_risk_skills: highRiskSkills || [],
    recent_skills: processedRecent,
    flagged_skills: flaggedSkills || [],
  };
};
