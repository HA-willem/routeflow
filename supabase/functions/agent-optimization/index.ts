// agent-optimization — Optimization Agent (43_AI_Agents.md §11, ADR-012 §1).
//
// Formaliseert de al-bestaande, productiebewezen route-optimize-Edge-Function
// (Sprint 4) tot agent: voegt geen nieuwe optimalisatielogica toe (43 §11),
// roept route-optimize aan met dry_run:true (candidate-only, geen
// schrijfactie) voor elke medewerker die al een route heeft op de gevraagde
// datum, en vertaalt het resultaat naar een kandidaat via
// lib/agents/optimization.ts (puur, unit-getest) — alleen wanneer de
// besparing betekenisvol is.
//
// Uitsluitend aanroepbaar met de service-rol (zelfde motivatie als
// agent-capacity). route-optimize zelf blijft voor het reguliere,
// gebruikersgeïnitieerde pad volledig ongewijzigd (zie route-optimize/index.ts).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildOptimizationCandidate } from '../../../lib/agents/optimization.ts';

import type { RawCandidate } from '../../../lib/agents/types.ts';

interface RequestBody {
  company_id: string;
  date: string;
}

interface DryRunResponse {
  stops: Array<{ jobId: string }>;
  unplaceable_job_ids: string[];
  total_drive_time_minutes: number;
  previous_total_drive_time_minutes: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireServiceRole(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
}

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.company_id !== 'string' || !UUID_RE.test(body.company_id)) return null;
  if (typeof body.date !== 'string' || !DATE_ONLY.test(body.date)) return null;
  return { company_id: body.company_id, date: body.date };
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Alleen POST is toegestaan.', 405);
  }
  if (!requireServiceRole(req)) {
    return errorResponse('unauthenticated', 'Uitsluitend voor interne agent-aanroepen.', 401);
  }

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return errorResponse(
      'validation_error',
      'company_id (uuid) en date (YYYY-MM-DD) zijn verplicht.',
      400,
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Alleen medewerkers die al een route hebben op deze datum zijn kandidaat
  // voor een "herschikken"-voorstel — een geheel nieuwe route plannen is geen
  // besparing-t.o.v.-vorige-keer (lib/agents/optimization.ts vereist
  // previousTotalDriveTimeMinutes !== null).
  const { data: existingRoutes, error: routesError } = await supabase
    .from('routes')
    .select('employee_id, employees!routes_employee_id_fkey(first_name)')
    .eq('company_id', body.company_id)
    .eq('route_date', body.date);

  if (routesError) {
    log('error', 'agent-optimization: kon routes niet ophalen', { code: routesError.code });
    return errorResponse('internal_error', 'Kon routes niet ophalen.', 500);
  }

  const serviceRoleAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  const functionsBaseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
  const candidates: RawCandidate[] = [];

  for (const route of existingRoutes ?? []) {
    const employeeFirstName =
      (route.employees as { first_name: string } | null)?.first_name ?? 'Onbekend';

    const response = await fetch(`${functionsBaseUrl}/route-optimize`, {
      method: 'POST',
      headers: { Authorization: serviceRoleAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: route.employee_id, date: body.date, dry_run: true }),
    }).catch((err: unknown) => {
      log('error', 'agent-optimization: route-optimize onbereikbaar', {
        employeeId: route.employee_id,
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    });

    if (!response || !response.ok) continue;

    const dryRun = (await response.json()) as DryRunResponse;
    const candidate = buildOptimizationCandidate({
      employeeId: route.employee_id,
      employeeFirstName,
      date: body.date,
      stopCount: dryRun.stops.length,
      totalDriveTimeMinutes: dryRun.total_drive_time_minutes,
      previousTotalDriveTimeMinutes: dryRun.previous_total_drive_time_minutes,
      jobIds: dryRun.stops.map((stop) => stop.jobId),
    });

    if (candidate) candidates.push(candidate);
  }

  return new Response(JSON.stringify({ candidates }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
