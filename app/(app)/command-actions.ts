'use server';

import { AnthropicIntentRouter } from '@/lib/ai/anthropic-provider';
import type { IntentCommand } from '@/lib/ai/types';
import { requireOnboardedUser } from '@/lib/auth/session';
import type { CommandCustomerResult } from '@/lib/command/types';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';

/** BR-202-grens (8,5u) — zelfde constante als agent-replanning/RouteBoard's capaciteitsbalk. */
const MAX_WORKDAY_MINUTES = 510;

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

export interface EmployeeCapacity {
  firstName: string;
  remainingMinutes: number;
}

/**
 * Live capaciteit per beschikbare medewerker, vandaag (BR-201/202) — hergebruikt
 * door de "wie kan er nog bij"- en "toon beschikbare medewerkers"-commando's in
 * de Command Bar. Zelfde berekening als agent-replanning/index.ts (resterende
 * ruimte = werkdaglimiet − al-geplande tijd), hier voor de ingelogde gebruiker
 * i.p.v. één specifieke ziekmelding.
 */
export async function getTodayCapacitySummary(): Promise<EmployeeCapacity[]> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employees }, { data: routes }, { data: availability }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('archived_at', null),
    supabase
      .from('routes')
      .select('employee_id, total_work_time_minutes')
      .eq('company_id', profile.company_id)
      .eq('route_date', today),
    supabase
      .from('availability')
      .select('employee_id, status')
      .eq('company_id', profile.company_id)
      .eq('date', today),
  ]);

  const unavailableIds = new Set(
    (availability ?? []).filter((a) => a.status !== 'available').map((a) => a.employee_id),
  );
  const workedMinutesByEmployee = new Map(
    (routes ?? []).map((r) => [r.employee_id, r.total_work_time_minutes ?? 0]),
  );

  return (employees ?? [])
    .filter((e) => !unavailableIds.has(e.id))
    .map((e) => ({
      firstName: e.first_name,
      remainingMinutes: Math.max(0, MAX_WORKDAY_MINUTES - (workedMinutesByEmployee.get(e.id) ?? 0)),
    }))
    .sort((a, b) => b.remainingMinutes - a.remainingMinutes);
}

export type AiCommandId =
  'plan_spoedklus' | 'wie_kan_bij' | 'verplaats_buitenwerk' | 'toon_beschikbaar';

/**
 * Gesloten commando-set voor Command Bar-intentherkenning (ADR-014) — nieuwe
 * commando's vereisen een expliciete toevoeging hier, nooit een prompt-wijziging
 * die het model meer vrijheid geeft.
 */
const AI_COMMANDS: IntentCommand[] = [
  { id: 'plan_spoedklus', label: 'Plan een spoedklus in' },
  { id: 'wie_kan_bij', label: 'Wie kan er vandaag nog een beurt bij hebben?' },
  { id: 'verplaats_buitenwerk', label: 'Verplaats buitenwerk na 15:00' },
  { id: 'toon_beschikbaar', label: 'Toon beschikbare medewerkers' },
];

/**
 * Vertaalt vrije tekst naar één van de bekende Command Bar-commando's (ADR-014:
 * "het taalmodel routeert, het beslist niet") — geeft uitsluitend een
 * commando-ID terug, nooit een gegenereerd antwoord. `null` bij ontbrekende
 * ANTHROPIC_API_KEY, een API-fout, of geen goede match — de Command Bar valt
 * dan terug op de vaste voorbeeldenlijst (graceful degradation, analoog AP-04).
 */
export async function routeAiCommand(text: string): Promise<AiCommandId | null> {
  const { user, profile } = await requireOnboardedUser();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const router = new AnthropicIntentRouter(apiKey);
    const { commandId, usage } = await router.routeIntent({ text, commands: AI_COMMANDS });
    await logAiUsage({ companyId: profile.company_id, userId: user.id, usage });
    return AI_COMMANDS.some((c) => c.id === commandId) ? (commandId as AiCommandId) : null;
  } catch (error) {
    logger.error('routeAiCommand: Anthropic-aanroep mislukt', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Logt tokengebruik van één Command Bar-aanroep (ADR-014, 032_ai_usage_tracking.sql)
 * t.b.v. het platform-admin kostendashboard. Best-effort: een mislukte log-insert
 * mag de gebruiker nooit blokkeren — de AI-routing zelf is al voltooid.
 */
async function logAiUsage({
  companyId,
  userId,
  usage,
}: {
  companyId: string;
  userId: string;
  usage: { model: string; inputTokens: number; outputTokens: number };
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('ai_usage_events').insert({
    company_id: companyId,
    user_id: userId,
    feature: 'command_bar_intent_routing',
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
  });

  if (error) {
    logger.error('logAiUsage: kon tokengebruik niet loggen', { message: error.message });
  }
}
