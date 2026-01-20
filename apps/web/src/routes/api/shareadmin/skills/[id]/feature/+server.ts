import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/server/db';
import { validateSession, getSessionCookieName } from '$lib/server/admin';

export const POST: RequestHandler = async ({ params, cookies }) => {
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
    .update({ is_featured: true })
    .eq('id', skillId);

  if (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }

  await supabase.from('admin_logs').insert({
    action: 'feature',
    target_skill_id: skillId,
    details: {},
  });

  return json({ success: true, data: { is_featured: true } });
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
    .update({ is_featured: false })
    .eq('id', skillId);

  if (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }

  await supabase.from('admin_logs').insert({
    action: 'unfeature',
    target_skill_id: skillId,
    details: {},
  });

  return json({ success: true, data: { is_featured: false } });
};
