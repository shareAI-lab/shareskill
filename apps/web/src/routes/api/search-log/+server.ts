import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  const supabase = getSupabase();

  let body: {
    query: string;
    results_count?: number;
    top_results?: number[];
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  if (!body.query) {
    return json(
      { success: false, error: { code: 'MISSING_FIELD', message: 'query is required' } },
      { status: 400 }
    );
  }

  const { error: insertErr } = await supabase.from('search_logs').insert({
    query: body.query,
    results_count: body.results_count ?? 0,
    top_results: body.top_results ?? [],
    source: body.source ?? 'web',
  });

  if (insertErr) {
    return json(
      { success: false, error: { code: 'INSERT_FAILED', message: insertErr.message } },
      { status: 500 }
    );
  }

  return json({ success: true });
};
