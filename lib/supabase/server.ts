import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database.types';

import { supabaseEnv } from './env';

/**
 * Server-Supabase-client (41_CodingStandards.md § 8) — voor RSC's en Server Actions.
 * Draagt de sessie-cookie van de ingelogde gebruiker door; RLS is actief (nooit de
 * service-role-key hier gebruiken — dat omzeilt RLS en daarmee NFR-301).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Genegeerd: een Server Component mag geen cookies schrijven. De sessie
          // wordt in dat geval ververst door de proxy (zie proxy.ts).
        }
      },
    },
  });
}
