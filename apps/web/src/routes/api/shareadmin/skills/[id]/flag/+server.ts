import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/server/db';
import { validateSession, getSessionCookieName } from '$lib/server/admin';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const sessionToken = cookies.get(getSessionCookieName());
  if (!validateSession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const skillId = parseInt(params.id);

  if (isNaN(skillId)) {
    return json({ success: false, error: 'Invalid skill ID' }, { status: 400 });
  }

  let reason = '';
  try {
    const body = await request.json();
    reason = body.reason || '';
  } catch {
    // No body provided
  }

  if (!reason) {
    return json({ success: false, error: 'Flag reason is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('skills')
    .update({
      is_flagged: true,
      flag_reason: reason,
      flagged_at: new Date().toISOString(),
    })
    .eq('id', skillId);

  if (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }

  await supabase.from('admin_logs').insert({
    action: 'flag',
    target_skill_id: skillId,
    details: { reason },
  });

  return json({ success: true, data: { is_flagged: true, flag_reason: reason } });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const sessionToken = cookies.get(getSessionCookieName());
  if (!validateSession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const skillId = parseInt(params.id);

  if (isNaN(skillId)) {
    return json({ success: false, error: 'Invalid skill ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('skills')
    .update({
      is_flagged: false,
      flag_reason: null,
      flagged_at: null,
    })
    .eq('id', skillId);

  if (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }

  await supabase.from('admin_logs').insert({
    action: 'unflag',
    target_skill_id: skillId,
    details: {},
  });

  return json({ success: true, data: { is_flagged: false } });
};
