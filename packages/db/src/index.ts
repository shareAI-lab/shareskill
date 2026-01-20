import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}

export function createSupabaseServiceClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type { SupabaseClient } from '@supabase/supabase-js';
