import { createClient } from '@supabase/supabase-js';
export function createSupabaseClient(url, key) {
    return createClient(url, key);
}
export function createSupabaseServiceClient(url, serviceKey) {
    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
