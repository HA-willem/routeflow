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

  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Sprint 4-ontwikkelgemak (tijdelijk, expliciet opt-in, nooit in Vercel-env's
  // gezet): met DEV_BYPASS_AUTH=true logt een niet-ingelogde bezoeker
  // automatisch in als het geconfigureerde lokale testaccount, zodat /login
  // niet steeds opnieuw doorlopen hoeft te worden tijdens UI-iteratie. Alleen
  // actief wanneer alle drie DEV_BYPASS_*-vars gezet zijn; de echte auth/RLS
  // blijven ongewijzigd — dit is puur een gemaksbypass van de proxy-redirect,
  // geen wijziging aan de beveiligingsgrens zelf. Verwijderen zodra de
  // login-flow weer actief onderwerp van ontwikkeling is.
  if (!user && process.env.DEV_BYPASS_AUTH === 'true') {
    const email = process.env.DEV_BYPASS_EMAIL;
    const password = process.env.DEV_BYPASS_PASSWORD;
    if (email && password) {
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      user = signInData.user;
    }
  }

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
