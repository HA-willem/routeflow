// agent-capacity — Capacity Agent (43_AI_Agents.md §9, ADR-012 §1).
//
// Analytisch, geen externe provider, geen schrijfactie: leest geplande
// beurten en medewerker-beschikbaarheid en genereert kandidaat-waarschuwingen
// via lib/agents/capacity.ts (puur, unit-getest). De laagste-risico-agent van
// Sprint 7 (zie de strategische review) — geen provider-adapter, geen
// mutatie, dus geen nieuwe faalmodus t.o.v. wat al bestond.
//
// Uitsluitend aanroepbaar met de service-rol: de nachtcyclus/Agent
// Orchestrator heeft geen ingelogde gebruiker, analoog aan hoe
// distance_cache uitsluitend via de service-rol bereikbaar is
// (015_distance_cache.sql). `company_id` wordt expliciet meegegeven en
// vervolgens op élke query herhaald (tenant-defense-in-depth, zelfde
// discipline als complete_job()'s expliciete eigenaarschapscontrole,
// 020_job_completion.sql).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { analyzeCapacity } from '../../../lib/agents/capacity.ts';

interface RequestBody {
  company_id: string;
  /** ISO-datums om te analyseren (meestal vandaag t/m +6 dagen). */
  dates: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** Vuistregel (43_AI_Agents.md §9) — hoeveel beurten één medewerker gemiddeld op één dag aankan. */
const AVERAGE_JOBS_PER_EMPLOYEE_PER_DAY = 6;

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireServiceRole(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  return authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
}

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.company_id !== 'string' || !UUID_RE.test(body.company_id)) return null;
  if (!Array.isArray(body.dates) || body.dates.length === 0) return null;
  if (!body.dates.every((d) => typeof d === 'string' && DATE_ONLY.test(d))) return null;
  return { company_id: body.company_id, dates: body.dates as string[] };
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
      'company_id (uuid) en dates (ISO-datums) zijn verplicht.',
      400,
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const [
    { data: jobs, error: jobsError },
    { data: availability, error: availabilityError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, scheduled_date')
      .eq('company_id', body.company_id)
      .in('scheduled_date', body.dates)
      .neq('status', 'cancelled'),
    supabase
      .from('availability')
      .select('employee_id, date, status')
      .eq('company_id', body.company_id)
      .in('date', body.dates),
    supabase
      .from('employees')
      .select('id')
      .eq('company_id', body.company_id)
      .eq('is_active', true)
      .is('archived_at', null),
  ]);

  if (jobsError || availabilityError || employeesError) {
    return errorResponse('internal_error', 'Kon capaciteitsgegevens niet ophalen.', 500);
  }

  const totalEmployees = (employees ?? []).length;

  // Geen rij in `availability` = beschikbaar (bestaand patroon, alleen
  // uitzonderingen — ziekte/verlof — krijgen een rij, scripts/seed-demo.ts).
  const unavailableByDate = new Map<string, Set<string>>();
  for (const row of availability ?? []) {
    if (row.status === 'available') continue;
    const set = unavailableByDate.get(row.date) ?? new Set<string>();
    set.add(row.employee_id);
    unavailableByDate.set(row.date, set);
  }

  const jobCountByDate = new Map<string, number>();
  for (const job of jobs ?? []) {
    jobCountByDate.set(job.scheduled_date, (jobCountByDate.get(job.scheduled_date) ?? 0) + 1);
  }

  const days = body.dates.map((date) => ({
    date,
    jobCount: jobCountByDate.get(date) ?? 0,
    availableEmployees: Math.max(0, totalEmployees - (unavailableByDate.get(date)?.size ?? 0)),
  }));

  // Elke kandidaat draagt zijn eigen datum (analyzeCapacity kijkt tot 7 dagen
  // vooruit) — nooit de run-datum van vandaag, anders verschijnt een
  // waarschuwing over woensdag ten onrechte in de briefing van vandaag.
  const dated = analyzeCapacity({
    days,
    averageJobsPerEmployeePerDay: AVERAGE_JOBS_PER_EMPLOYEE_PER_DAY,
  });
  const candidates = dated.map((d) => ({ ...d.candidate, scheduled_date: d.date }));

  return new Response(JSON.stringify({ candidates }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
