import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
  const supabase = getSupabase();
  const hours = parseInt(url.searchParams.get('hours') || '168'); // Default 7 days

  // Get event summary by type
  const { data: eventsByType } = await supabase
    .from('events')
    .select('event_type')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

  const eventSummary = {
    view: 0,
    search: 0,
    download: 0,
    install: 0,
  };

  (eventsByType || []).forEach((e: any) => {
    if (e.event_type in eventSummary) {
      eventSummary[e.event_type as keyof typeof eventSummary]++;
    }
  });

  // Get source distribution
  const { data: eventsBySource } = await supabase
    .from('events')
    .select('source')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

  const sourceDistribution: Record<string, number> = {};
  (eventsBySource || []).forEach((e: any) => {
    const src = e.source || 'unknown';
    sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
  });

  // Get top searches
  const { data: topSearches } = await supabase.rpc('get_top_searches', {
    limit_count: 20,
    hours: hours,
  });

  // Get zero-result searches
  const { data: zeroResultSearches } = await supabase.rpc('get_zero_result_searches', {
    limit_count: 20,
  });

  // Get total counts
  const { count: totalSearches } = await supabase
    .from('search_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

  const { count: totalEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

  return {
    event_summary: eventSummary,
    source_distribution: sourceDistribution,
    top_searches: topSearches || [],
    zero_result_searches: zeroResultSearches || [],
    total_searches: totalSearches || 0,
    total_events: totalEvents || 0,
    hours,
  };
};
