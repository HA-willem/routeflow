'use server';

import { requireOnboardedUser } from '@/lib/auth/session';
import type { CommandCustomerResult } from '@/lib/command/types';
import { createClient } from '@/lib/supabase/server';

/**
 * Klantzoeken voor de Command Bar (⌘K) — lichte, read-only lookup binnen RLS.
 * Bewust geen ActionResult-envelop: een mislukte zoekopdracht toont gewoon
 * "geen resultaten", er is geen formulierstaat om terug te koppelen.
 */
export async function searchCustomersForCommand(query: string): Promise<CommandCustomerResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select('id, name, objects(city)')
    .eq('company_id', profile.company_id)
    .is('archived_at', null)
    .ilike('name', `%${trimmed.replaceAll(/[%_\\]/g, '')}%`)
    .order('name', { ascending: true })
    .limit(6);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.objects?.[0]?.city ?? null,
  }));
}
