// agent-replanning — Replanning Agent (43_AI_Agents.md §5, Sprint 7-vervolg,
// BR-802). In tegenstelling tot Capacity/Optimization/Weather Agent is dit
// GEEN lid van de dagelijkse agent-orchestrator-cyclus (ADR-011 §6: "een
// user-actie tijdens de dag genereert een gerichte tussentijdse Replanning
// Agent-aanroep") — deze functie doorloopt daarom zelfstandig dezelfde
// gedeelde pipeline-stadia (Conflict Detector → Suggestion Generator →
// Explanation Generator → Approval Handler) die agent-orchestrator ook
// gebruikt, i.p.v. daarop te wachten.
//
// Trigger: een Server Action (app/(app)/planning/actions.ts, "ziek/verlof
// melden") roept deze functie direct aan nadat een `availability`-rij is
// aangemaakt — met de sessie van de ingelogde planner/eigenaar, niet de
// service-rol (analoog aan route-optimize/route-move-job, ADR-003: RLS is de
// autorisatiegrens voor het door-een-gebruiker-geïnitieerde pad). De
// service-rol blijft ondersteund voor een toekomstig, niet-ingelogd
// triggerpad (bv. een latere nachtcyclus-uitbreiding), maar wordt uitsluitend
// gebruikt voor de agent_runs/agent_proposals-schrijfacties zelf — die twee
// tabellen kennen géén INSERT-grant voor `authenticated` (022_agent_pipeline.sql),
// exact zoals route-optimize dat voor `distance_cache` doet.
//
// Scope: ziekmelding/verlof van één medewerker op één dag —
// spoedopdracht/niet-thuis/weersgedreven herplanning zijn bewust nog niet
// aangesloten (zelfde vorm, andere trigger, latere sprint).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { decideApproval } from '../../../lib/agents/approval-handler.ts';
import { detectConflicts } from '../../../lib/agents/conflict-detector.ts';
import { validateExplanation } from '../../../lib/agents/explanation-generator.ts';
import { analyzeReplanning } from '../../../lib/agents/replanning.ts';
import { generateSuggestion } from '../../../lib/agents/suggestion-generator.ts';

interface RequestBody {
  company_id: string;
  employee_id: string;
  date: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** BR-202: werkdaglimiet (uren) — zelfde grens als RouteBoard's capaciteitsbalk (42_DesignSystem.md §14). */
const MAX_WORKDAY_MINUTES = 510;

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.company_id !== 'string' || !UUID_RE.test(body.company_id)) return null;
  if (typeof body.employee_id !== 'string' || !UUID_RE.test(body.employee_id)) return null;
  if (typeof body.date !== 'string' || !DATE_ONLY.test(body.date)) return null;
  return { company_id: body.company_id, employee_id: body.employee_id, date: body.date };
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

const AFFECTED_JOB_SELECT = `id, locked, estimated_duration_minutes,
  service_agreements!jobs_service_agreement_id_fkey(
    objects!service_agreements_object_id_fkey(
      customers!objects_customer_id_fkey(name)
    )
  )`;

interface AffectedJobRow {
  id: string;
  locked: boolean;
  estimated_duration_minutes: number;
  service_agreements: {
    objects: { customers: { name: string } | null } | null;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Alleen POST is toegestaan.', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('unauthenticated', 'Niet ingelogd.', 401);
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
      'company_id (uuid), employee_id (uuid) en date (YYYY-MM-DD) zijn verplicht.',
      400,
    );
  }

  const isServiceRoleCaller = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

  // Reads via RLS onder de sessie van de aanroeper (route-optimize-precedent)
  // — een planner ziet uitsluitend zijn eigen bedrijf, ongeacht de
  // meegegeven company_id (defense-in-depth, niet de enige grens).
  const scopedSupabase = isServiceRoleCaller
    ? createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    : createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });

  // agent_runs/agent_proposals kennen geen INSERT-grant voor `authenticated`
  // (022_agent_pipeline.sql) — uitsluitend deze twee schrijfacties gebruiken
  // daarom altijd de service-rol, ongeacht wie de aanroeper is.
  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: run, error: runError } = await serviceSupabase
    .from('agent_runs')
    .insert({ company_id: body.company_id, agent: 'replanning' })
    .select('id, started_at')
    .single();
  if (runError || !run) {
    log('error', 'agent-replanning: kon agent_run niet aanmaken', { code: runError?.code });
    return errorResponse('internal_error', 'Kon agent-run niet starten.', 500);
  }
  const startedAt = new Date(run.started_at as string).getTime();

  async function finishRun(
    result: 'success' | 'failed',
    candidateCount: number,
    errorMessage?: string,
  ) {
    const finishedAt = Date.now();
    await serviceSupabase
      .from('agent_runs')
      .update({
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: finishedAt - startedAt,
        result,
        candidate_count: candidateCount,
        error_message: errorMessage ?? null,
      })
      .eq('id', run.id);
  }

  const [{ data: sickEmployee }, { data: sickRoute }, { data: colleagueEmployees }] =
    await Promise.all([
      scopedSupabase
        .from('employees')
        .select('id, first_name')
        .eq('company_id', body.company_id)
        .eq('id', body.employee_id)
        .maybeSingle(),
      scopedSupabase
        .from('routes')
        .select('id')
        .eq('company_id', body.company_id)
        .eq('employee_id', body.employee_id)
        .eq('route_date', body.date)
        .maybeSingle(),
      scopedSupabase
        .from('employees')
        .select('id, first_name')
        .eq('company_id', body.company_id)
        .eq('is_active', true)
        .is('archived_at', null)
        .neq('id', body.employee_id),
    ]);

  if (!sickEmployee) {
    await finishRun('failed', 0, 'Medewerker niet gevonden.');
    return errorResponse('not_found', 'Medewerker niet gevonden.', 404);
  }

  if (!sickRoute) {
    // Geen route die dag = niets te herverdelen — geldig, geen fout.
    await finishRun('success', 0);
    return new Response(JSON.stringify({ proposal_id: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [
    { data: affectedJobRows, error: jobsError },
    { data: colleagueRoutes, error: routesError },
    { data: colleagueAvailability, error: availabilityError },
  ] = await Promise.all([
    scopedSupabase
      .from('jobs')
      .select(AFFECTED_JOB_SELECT)
      .eq('company_id', body.company_id)
      .eq('route_id', sickRoute.id)
      .neq('status', 'cancelled'),
    scopedSupabase
      .from('routes')
      .select('id, employee_id, total_work_time_minutes')
      .eq('company_id', body.company_id)
      .eq('route_date', body.date)
      .in(
        'employee_id',
        (colleagueEmployees ?? []).map((e) => e.id),
      ),
    // BR-201: een collega die zelf ook afwezig is (ziek/verlof) op deze datum
    // is geen geldig herverdelingsdoel — geen rij = beschikbaar (zelfde
    // patroon als agent-capacity/index.ts), alleen expliciete uitzonderingen
    // (status != 'available') sluiten iemand uit.
    scopedSupabase
      .from('availability')
      .select('employee_id, status')
      .eq('company_id', body.company_id)
      .eq('date', body.date)
      .in(
        'employee_id',
        (colleagueEmployees ?? []).map((e) => e.id),
      ),
  ]);

  if (jobsError || routesError || availabilityError) {
    await finishRun('failed', 0, 'Kon beurten/routes/beschikbaarheid niet ophalen.');
    return errorResponse('internal_error', 'Kon beurten/routes/beschikbaarheid niet ophalen.', 500);
  }

  const unavailableColleagueIds = new Set(
    (colleagueAvailability ?? []).filter((a) => a.status !== 'available').map((a) => a.employee_id),
  );

  const colleagueNameById = new Map((colleagueEmployees ?? []).map((e) => [e.id, e.first_name]));
  const colleagues = (colleagueRoutes ?? [])
    .filter((r) => !unavailableColleagueIds.has(r.employee_id))
    .map((r) => ({
      employeeId: r.employee_id,
      firstName: colleagueNameById.get(r.employee_id) ?? 'Onbekend',
      routeId: r.id,
      remainingMinutes: Math.max(0, MAX_WORKDAY_MINUTES - (r.total_work_time_minutes ?? 0)),
    }))
    // Alleen collega's met daadwerkelijk resterende ruimte zijn kandidaat —
    // BR-202 (route-move-job handhaaft dit sowieso hard bij uitvoering, dit
    // voorkomt alleen een voorstel dat toch al zou falen).
    .filter((c) => c.remainingMinutes > 0);

  const affectedJobs = ((affectedJobRows ?? []) as unknown as AffectedJobRow[]).map((row) => ({
    jobId: row.id,
    customerName: row.service_agreements?.objects?.customers?.name ?? 'Onbekende klant',
    serviceDurationMinutes: row.estimated_duration_minutes,
    locked: row.locked,
  }));

  const candidate = analyzeReplanning({
    sickEmployeeId: body.employee_id,
    sickEmployeeFirstName: sickEmployee.first_name,
    date: body.date,
    affectedJobs,
    colleagues,
  });

  if (!candidate) {
    await finishRun('success', 0);
    return new Response(JSON.stringify({ proposal_id: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const suggestion = generateSuggestion(candidate, 'replanning', body.date);

  // Conflict Detector-context (ADR-012 §2, tenant-defense-in-depth) — zelfde
  // toetsing als agent-orchestrator, hier voor één kandidaat i.p.v. een batch.
  const [{ data: companyJobs }, { data: companyEmployees }] = await Promise.all([
    scopedSupabase
      .from('jobs')
      .select('id, locked')
      .eq('company_id', body.company_id)
      .in('id', suggestion.impactedJobIds),
    scopedSupabase
      .from('employees')
      .select('id')
      .eq('company_id', body.company_id)
      .in('id', suggestion.impactedEmployeeIds),
  ]);

  const conflictResult = detectConflicts(suggestion, {
    lockedJobIds: new Set((companyJobs ?? []).filter((j) => j.locked).map((j) => j.id)),
    companyJobIds: new Set((companyJobs ?? []).map((j) => j.id)),
    companyEmployeeIds: new Set((companyEmployees ?? []).map((e) => e.id)),
  });
  if (!conflictResult.valid) {
    log('info', 'agent-replanning: kandidaat verworpen door Conflict Detector', {
      reason: conflictResult.reason,
    });
    await finishRun('success', 0);
    return new Response(JSON.stringify({ proposal_id: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const explanationResult = validateExplanation(suggestion);
  if (!explanationResult.valid) {
    log('error', 'agent-replanning: kandidaat verworpen door Explanation Generator', {
      missingFields: explanationResult.missingFields,
    });
    await finishRun('failed', 0, 'Onvolledig explainability-schema.');
    return errorResponse(
      'internal_error',
      'Kandidaat voldeed niet aan het verplichte schema.',
      500,
    );
  }

  // Automatiseringsniveau/confidence-drempel per agent (042_agent_settings.sql,
  // "AI-assistent"-instellingenpagina) — ontbrekende rij = decideApproval()'s
  // eigen default (proposal/0.7, lib/agents/approval-handler.ts).
  const { data: replanningSettings } = await serviceSupabase
    .from('agent_settings')
    .select('automation_level, confidence_threshold')
    .eq('company_id', body.company_id)
    .eq('agent', 'replanning')
    .maybeSingle();

  const approval = decideApproval({
    actionType: suggestion.payload?.type ?? null,
    automationLevel: replanningSettings?.automation_level ?? 'proposal',
    confidence: suggestion.confidence,
    confidenceThreshold: replanningSettings?.confidence_threshold,
  });

  const { data: inserted, error: insertError } = await serviceSupabase
    .from('agent_proposals')
    .insert({
      company_id: body.company_id,
      agent_run_id: run.id,
      agent: suggestion.agent,
      scheduled_date: suggestion.scheduledDate,
      title: suggestion.title,
      summary: suggestion.summary,
      reasoning: suggestion.reasoning,
      data_sources: suggestion.dataSources,
      business_rules: suggestion.businessRules,
      confidence: suggestion.confidence,
      impact: suggestion.impact,
      expected_gain: suggestion.expectedGain,
      alternatives: suggestion.alternatives,
      severity: suggestion.severity,
      impacted_job_ids: suggestion.impactedJobIds,
      impacted_employee_ids: suggestion.impactedEmployeeIds,
      payload: suggestion.payload ?? null,
      approval_status: approval.outcome === 'auto_execute' ? 'auto_executed' : 'proposed',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    log('error', 'agent-replanning: kon voorstel niet opslaan', { code: insertError?.code });
    await finishRun('failed', 0, 'Kon voorstel niet opslaan.');
    return errorResponse('internal_error', 'Kon voorstel niet opslaan.', 500);
  }

  await finishRun('success', 1);
  return new Response(JSON.stringify({ proposal_id: inserted.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
