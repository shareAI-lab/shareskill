import { env } from '$env/dynamic/private';
import { createSupabaseClient } from '@shareskill/db';
import type { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient(
      env.SUPABASE_URL!,
      env.SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}
