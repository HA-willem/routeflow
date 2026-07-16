// planning-generate — 13_API_Specificatie.md § 4, FR-020, ADR-008.
//
// Genereert `voorgesteld`-beurten voor dienstafspraken (horizon-laag,
// 15_AIPlanner.md § 1.1) op basis van BR-001 (ideale datum = laatste
// `uitgevoerd` + interval)/BR-102 (once = geen opvolger)/BR-103 (maandpatronen).
//
// Draait onder de sessie van de aanroeper (JWT uit de Authorization-header)
// voor het reguliere, door-de-gebruiker-geïnitieerde pad: RLS is dan de enige
// autorisatiegrens (ADR-003) en de insert/update-policies op
// `jobs`/`service_agreements` staan dit al toe voor owner/admin/planner
// (23_Gebruikersrollen.md § 2, 009_jobs.sql).
//
// `service_agreement_id` is een optionele uitbreiding op de
// 13_API_Specificatie.md § 4-body (die alleen `{ from_date, weeks }`
// documenteert): scoped de generatie tot één dienstafspraak, gebruikt door de
// Server Action na het aanmaken/hervatten van een afspraak (FR-004 AC3 /
// FR-005) i.p.v. steeds de hele tenant te herberekenen.
//
// `company_id` (Planning Agent, 43_AI_Agents.md § 4, Sprint 7-vervolg): een
// tweede, service-rol-only aanroeppad voor de dagelijkse cyclus
// (agent-planning/agent-orchestrator, geen ingelogde gebruiker). De
// service-rol omzeilt RLS volledig — zonder een expliciete company_id-filter
// zou de agreements-query hierboven dan over ALLE bedrijven heen lopen. Dit
// veld is daarom verplicht zodra de aanroeper de service-rol is (geweigerd
// met 400 als het ontbreekt), en wordt bij elke query expliciet meegegeven
// i.p.v. op RLS te vertrouwen — zelfde defense-in-depth-motivatie als
// route-optimize's `dry_run`-service-rol-pad (022_agent_pipeline.sql-precedent).
// Het reguliere, gebruikersgeïnitieerde pad blijft ongewijzigd (company_id
// wordt dan genegeerd, RLS scoped al correct).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { generateHorizonDates, type HorizonAgreement } from '../../../lib/planning/horizon.ts';

interface RequestBody {
  from_date: string;
  weeks: number;
  service_agreement_id?: string;
  company_id?: string;
}

interface AppError {
  code: string;
  message: string;
  hint?: string;
}

function errorResponse(error: AppError, status: number): Response {
  return new Response(JSON.stringify({ error: { ...error, status } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.from_date !== 'string' || !DATE_ONLY.test(body.from_date)) {
    return null;
  }
  if (
    typeof body.weeks !== 'number' ||
    !Number.isInteger(body.weeks) ||
    body.weeks < 1 ||
    body.weeks > 52
  ) {
    return null;
  }
  if (body.service_agreement_id !== undefined && typeof body.service_agreement_id !== 'string') {
    return null;
  }
  if (
    body.company_id !== undefined &&
    (typeof body.company_id !== 'string' || !UUID_RE.test(body.company_id))
  ) {
    return null;
  }
  return {
    from_date: body.from_date,
    weeks: body.weeks,
    service_agreement_id: body.service_agreement_id as string | undefined,
    company_id: body.company_id as string | undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse(
      { code: 'method_not_allowed', message: 'Alleen POST is toegestaan.' },
      405,
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse({ code: 'unauthenticated', message: 'Niet ingelogd.' }, 401);
  }

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return errorResponse(
      {
        code: 'validation_error',
        message: 'from_date (YYYY-MM-DD) en weeks (1-52) zijn verplicht.',
      },
      400,
    );
  }

  const isServiceRoleCaller = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (isServiceRoleCaller && !body.company_id) {
    return errorResponse(
      {
        code: 'validation_error',
        message: 'company_id (uuid) is verplicht voor service-rol-aanroepen (Planning Agent).',
      },
      400,
    );
  }

  // Service-rol (Planning Agent, dagelijkse cyclus, geen ingelogde gebruiker)
  // omzeilt RLS volledig — de company_id-filter hieronder is daarom géén
  // optionele extra maar de enige tenant-grens op dit pad (zie module-comment).
  // Het reguliere pad blijft de sessie van de aanroeper gebruiken; RLS scoped
  // daar al correct.
  const supabase = isServiceRoleCaller
    ? createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    : createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });

  let agreementsQuery = supabase
    .from('service_agreements')
    .select(
      'id, company_id, frequency_type, frequency_interval_days, preferred_day, exclude_dates, status, service_id, last_completed_job_id',
    )
    .eq('status', 'active');

  if (body.company_id) {
    agreementsQuery = agreementsQuery.eq('company_id', body.company_id);
  }

  if (body.service_agreement_id) {
    agreementsQuery = agreementsQuery.eq('id', body.service_agreement_id);
  }

  const { data: agreements, error: agreementsError } = await agreementsQuery;

  if (agreementsError) {
    log('error', 'planning-generate: kon dienstafspraken niet ophalen', {
      code: agreementsError.code,
    });
    return errorResponse(
      { code: 'internal_error', message: 'Kon dienstafspraken niet ophalen.' },
      500,
    );
  }

  if (body.service_agreement_id && agreements.length === 0) {
    // RLS laat een dienstafspraak van een andere tenant niet zichtbaar zijn —
    // "niet gevonden" en "geen toegang" zijn hier bewust niet te onderscheiden
    // (13_API_Specificatie.md § 6: 404 verbergt bestaan buiten eigen tenant).
    return errorResponse({ code: 'not_found', message: 'Dienstafspraak niet gevonden.' }, 404);
  }

  const generatedJobs: { service_agreement_id: string; dates: string[] }[] = [];
  const skippedAgreements: { service_agreement_id: string; reason: string }[] = [];

  for (const agreement of agreements) {
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('standard_duration_minutes')
      .eq('id', agreement.service_id)
      .single();

    if (serviceError || !service) {
      skippedAgreements.push({ service_agreement_id: agreement.id, reason: 'service_not_found' });
      continue;
    }

    let lastCompletedDate: string | null = null;
    if (agreement.last_completed_job_id) {
      const { data: lastJob } = await supabase
        .from('jobs')
        .select('completed_at')
        .eq('id', agreement.last_completed_job_id)
        .single();
      lastCompletedDate = lastJob?.completed_at ? lastJob.completed_at.slice(0, 10) : null;
    }

    const horizonAgreement: HorizonAgreement = {
      frequencyType: agreement.frequency_type,
      frequencyIntervalDays: agreement.frequency_interval_days,
      preferredDay: agreement.preferred_day,
      excludeDates: agreement.exclude_dates ?? [],
    };

    const dates = generateHorizonDates({
      agreement: horizonAgreement,
      lastCompletedDate,
      fromDate: body.from_date,
      weeks: body.weeks,
    });

    if (dates.length === 0) {
      skippedAgreements.push({ service_agreement_id: agreement.id, reason: 'no_dates_in_horizon' });
      continue;
    }

    const rows = dates.map((scheduledDate) => ({
      company_id: agreement.company_id,
      service_agreement_id: agreement.id,
      scheduled_date: scheduledDate,
      status: 'proposed' as const,
      estimated_duration_minutes: service.standard_duration_minutes,
    }));

    // BR-203/jobs_agreement_date_unique: een eerder gegenereerde voorgestelde
    // beurt op dezelfde datum is geen fout, gewoon al gedaan werk — negeren
    // i.p.v. de hele batch te laten falen op de unique-constraint. `.select()`
    // is hier geen optionele toevoeging: `ON CONFLICT DO NOTHING RETURNING *`
    // levert uitsluitend de daadwerkelijk ingevoegde rijen terug — zonder deze
    // call zou `dates` (berekend, niet per se nieuw) bij elke herhaalde
    // dagelijkse cyclus (Planning Agent, 43_AI_Agents.md § 4) een identiek
    // "X nieuwe beurten"-resultaat blijven melden, ook wanneer er niets nieuws
    // is bijgekomen — misleidende Briefing-ruis (ADR-011: "nooit een kale/
    // onjuiste lege staat", hier het omgekeerde risico: een onterecht volle).
    const { data: insertedRows, error: insertError } = await supabase
      .from('jobs')
      .upsert(rows, { onConflict: 'service_agreement_id,scheduled_date', ignoreDuplicates: true })
      .select('scheduled_date');

    if (insertError) {
      log('error', 'planning-generate: job-insert mislukt', {
        code: insertError.code,
        serviceAgreementId: agreement.id,
      });
      skippedAgreements.push({ service_agreement_id: agreement.id, reason: 'insert_failed' });
      continue;
    }

    const { error: nextIdealDateError } = await supabase
      .from('service_agreements')
      .update({ next_ideal_date: dates[0] })
      .eq('id', agreement.id);

    if (nextIdealDateError) {
      log('error', 'planning-generate: next_ideal_date-update mislukt', {
        code: nextIdealDateError.code,
        serviceAgreementId: agreement.id,
      });
    }

    const newlyInsertedDates = (insertedRows ?? []).map((r) => r.scheduled_date as string);
    if (newlyInsertedDates.length === 0) {
      skippedAgreements.push({ service_agreement_id: agreement.id, reason: 'already_generated' });
      continue;
    }

    generatedJobs.push({ service_agreement_id: agreement.id, dates: newlyInsertedDates });
  }

  log('info', 'planning-generate: voltooid', {
    processed: agreements.length,
    generated: generatedJobs.length,
    skipped: skippedAgreements.length,
  });

  return new Response(
    JSON.stringify({ generated_jobs: generatedJobs, skipped_agreements: skippedAgreements }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
