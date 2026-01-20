import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSupabase } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  const supabase = getSupabase();

  let body: {
    skill_id?: number;
    skill_key?: string;
    event_type: string;
    source?: string;
    metadata?: Record<string, any>;
  };

  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  if (!body.event_type) {
    return json(
      { success: false, error: { code: 'MISSING_FIELD', message: 'event_type is required' } },
      { status: 400 }
    );
  }

  const validEventTypes = ['view', 'search', 'download', 'install', 'resource_access'];
  if (!validEventTypes.includes(body.event_type)) {
    return json(
      {
        success: false,
        error: {
          code: 'INVALID_EVENT_TYPE',
          message: `event_type must be one of: ${validEventTypes.join(', ')}`,
        },
      },
      { status: 400 }
    );
  }

  const { error: insertErr } = await supabase.from('events').insert({
    event_type: body.event_type,
    skill_id: body.skill_id ?? null,
    skill_key: body.skill_key ?? null,
    source: body.source ?? 'web',
    metadata: body.metadata ?? {},
  });

  if (insertErr) {
    return json(
      { success: false, error: { code: 'INSERT_FAILED', message: insertErr.message } },
      { status: 500 }
    );
  }

  return json({ success: true });
};
