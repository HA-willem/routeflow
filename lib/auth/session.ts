import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

import type { User } from '@supabase/supabase-js';

type UserProfile = Database['public']['Tables']['users']['Row'];

export interface SessionContext {
  user: User;
  profile: UserProfile | null;
}

/**
 * Haalt de huidige gebruiker + profiel op. Gebruikt altijd `getUser()` (nooit
 * `getSession()`) omdat dat de JWT server-side revalideert bij Supabase Auth in
 * plaats van een mogelijk verouderde cookie te vertrouwen (36_Security.md § 2).
 *
 * `profile === null` betekent: ingelogd, maar nog geen `onboard_company()`
 * doorlopen (23_Gebruikersrollen.md, FR-101) — RLS toont dan bewust nog geen rij
 * omdat `current_company_id()` nog niet in de JWT staat.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

/** Voor RSC's/pagina's die uitsluitend een ingelogde gebruiker vereisen. */
export async function requireUser(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/** Voor RSC's/pagina's die een volledig onboarded gebruiker (met Bedrijf) vereisen. */
export async function requireOnboardedUser(): Promise<SessionContext & { profile: UserProfile }> {
  const session = await requireUser();
  if (!session.profile) {
    redirect('/onboarding');
  }
  return session as SessionContext & { profile: UserProfile };
}
