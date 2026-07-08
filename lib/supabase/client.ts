import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database.types';

import { supabaseEnv } from './env';

/**
 * Browser-Supabase-client (41_CodingStandards.md § 8) — voor Client Components.
 * RLS is actief: de anon-key + gebruikers-JWT bepalen wat zichtbaar is (ADR-003/004).
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseEnv.url, supabaseEnv.anonKey);
}
