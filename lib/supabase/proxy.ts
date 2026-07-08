import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@/types/database.types';

import { supabaseEnv } from './env';

export interface ProxySession {
  response: NextResponse;
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

/**
 * Ververst de Supabase-sessie op basis van de request-cookies en bepaalt of de
 * gebruiker is ingelogd en onboarded (heeft een Bedrijf). Wordt uitsluitend vanuit
 * proxy.ts aangeroepen (41_CodingStandards.md § 8; Next.js 16 hernoemde "middleware"
 * naar "proxy").
 */
export async function updateSession(request: NextRequest): Promise<ProxySession> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response, isAuthenticated: false, isOnboarded: false };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return { response, isAuthenticated: true, isOnboarded: profile !== null };
}
