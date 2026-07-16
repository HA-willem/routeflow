import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import type { User } from '@supabase/supabase-js';

export interface PlatformAdminContext {
  user: User;
}

/**
 * Platform-admin-guard (ADR-013 §1, BR-900) — volledig los van
 * requireOnboardedUser()/current_company_id(): checkt uitsluitend de
 * allowlist (is_platform_admin(), 027_platform_admins.sql). Geen enkele
 * Bedrijfsrol, ook niet Eigenaar, geeft hier ooit toegang
 * (23_Gebruikersrollen.md § 7).
 *
 * `notFound()` i.p.v. een 403/redirect voor niet-admins — zelfde patroon als
 * elders in de app (bv. klanten/[id]/page.tsx) waar RLS een niet-toegankelijke
 * rij ook als "niet gevonden" behandelt i.p.v. het bestaan van de route te
 * bevestigen aan een niet-geautoriseerde gebruiker.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: isAdmin } = await supabase.rpc('is_platform_admin');

  if (!isAdmin) {
    notFound();
  }

  return { user };
}
