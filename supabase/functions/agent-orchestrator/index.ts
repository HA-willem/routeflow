// agent-orchestrator — AI Orchestrator (ADR-011 §3, ADR-012 §1/§2).
//
// Coördineert de drie Sprint 7-agents (Weather → Optimization → Capacity,
// ADR-012 §1-volgorde) voor één bedrijf en laat elke kandidaat de gedeelde
// Execution Pipeline doorlopen (Conflict Detector → Suggestion Generator →
// Explanation Generator → Approval Handler, ADR-012 §2) — geen domeinlogica
// hier, uitsluitend volgorde, dependency-resolutie en foutisolatie (ADR-011
// §3: "Orchestrator kent zelf geen domeinlogica").
//
// Sprint 7-scope: de drie agents zijn onderling logisch onafhankelijk (geen
// van hun input hangt af van elkaars output — dat verandert pas zodra
// Weather-signalen daadwerkelijk een Replanning-trigger worden, een latere
// sprint); sequentieel uitgevoerd voor eenvoudige logging/foutisolatie, niet
// omdat het technisch vereist is.
//
// Aanroep: POST { company_id }, service-rol-only (nachtcyclus/handmatige
// trigger heeft geen ingelogde gebruiker). pg_cron-scheduling is bewust nog
// niet gebouwd dit sprint (zie release-notitie) — deze functie is wél
// volledig zelfstandig bruikbaar via een directe aanroep, wat ook het
// geteste pad is (tests/integration).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { decideApproval } from '../../../lib/agents/approval-handler.ts';
import { detectConflicts } from '../../../lib/agents/conflict-detector.ts';
import { validateExplanation } from '../../../lib/agents/explanation-generator.ts';
import { generateSuggestion } from '../../../lib/agents/suggestion-generator.ts';

import type { AgentName, PipelineCandidate } from '../../../lib/agents/types.ts';

interface RequestBody {
  company_id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAPACITY_HORIZON_DAYS = 7;

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
  return { company_id: body.company_id };
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function callAgentFunction(
  baseUrl: string,
  serviceRoleAuth: string,
  name: string,
  body: Record<string, unknown>,
): Promise<{ candidates: unknown[] } | null> {
  const response = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: { Authorization: serviceRoleAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err: unknown) => {
    log('error', `agent-orchestrator: ${name} onbereikbaar`, {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!response || !response.ok) return null;
  return (await response.json()) as { candidates: unknown[] };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Alleen POST is toegestaan.', 405);
  }
  if (!requireServiceRole(req)) {
    return errorResponse('unauthenticated', 'Uitsluitend voor interne/nachtcyclus-aanroepen.', 401);
  }

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return errorResponse('validation_error', 'company_id (uuid) is verplicht.', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', body.company_id)
    .maybeSingle();
  if (companyError || !company) {
    return errorResponse('not_found', 'Bedrijf niet gevonden.', 404);
  }

  const serviceRoleAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  const functionsBaseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
  const today = todayIso();
  const capacityDates = Array.from({ length: CAPACITY_HORIZON_DAYS }, (_unused, i) =>
    addDaysIso(today, i),
  );

  const agentRuns: Record<AgentName, { id: string; startedAt: number }> = {} as never;
  const rawCandidatesByAgent: Array<{ agent: AgentName; date: string; raw: unknown[] }> = [];

  const AGENT_CALLS: Array<{
    agent: AgentName;
    functionName: string;
    requestBody: Record<string, unknown>;
    scheduledDate: string;
  }> = [
    {
      agent: 'weather',
      functionName: 'agent-weather',
      requestBody: { company_id: body.company_id, date: today },
      scheduledDate: today,
    },
    {
      agent: 'optimization',
      functionName: 'agent-optimization',
      requestBody: { company_id: body.company_id, date: today },
      scheduledDate: today,
    },
    {
      agent: 'capacity',
      functionName: 'agent-capacity',
      requestBody: { company_id: body.company_id, dates: capacityDates },
      scheduledDate: today,
    },
  ];

  for (const call of AGENT_CALLS) {
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({ company_id: body.company_id, agent: call.agent })
      .select('id, started_at')
      .single();

    if (runError || !run) {
      log('error', 'agent-orchestrator: kon agent_run niet aanmaken', {
        agent: call.agent,
        code: runError?.code,
      });
      continue;
    }
    agentRuns[call.agent] = { id: run.id, startedAt: new Date(run.started_at).getTime() };

    const result = await callAgentFunction(
      functionsBaseUrl,
      serviceRoleAuth,
      call.functionName,
      call.requestBody,
    );

    const finishedAt = Date.now();
    await supabase
      .from('agent_runs')
      .update({
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: finishedAt - agentRuns[call.agent]!.startedAt,
        result: result ? 'success' : 'failed',
        candidate_count: result?.candidates.length ?? 0,
        error_message: result ? null : `${call.functionName} onbereikbaar of gaf een foutstatus.`,
      })
      .eq('id', run.id);

    if (result) {
      rawCandidatesByAgent.push({
        agent: call.agent,
        date: call.scheduledDate,
        raw: result.candidates,
      });
    }
  }

  // Suggestion Generator (ADR-012 §2): agent/datum toevoegen. Een kandidaat
  // mag zijn eigen `scheduled_date` meedragen (Capacity Agent kijkt tot 7
  // dagen vooruit — elke kandidaat gaat over een andere dag dan de run-datum);
  // ontbreekt dat veld, dan geldt de call-datum (Weather/Optimization, altijd
  // "vandaag" in Sprint 7-scope).
  const suggested: PipelineCandidate[] = rawCandidatesByAgent.flatMap(({ agent, date, raw }) =>
    (raw as Array<Parameters<typeof generateSuggestion>[0] & { scheduled_date?: string }>).map(
      (candidate) => generateSuggestion(candidate, agent, candidate.scheduled_date ?? date),
    ),
  );

  if (suggested.length === 0) {
    return new Response(JSON.stringify({ proposals_created: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Conflict Detector-context in één batch ophalen (ADR-012 §2) — nooit per
  // kandidaat een losse query, dat zou N+1 zijn (41_CodingStandards.md §17).
  const allImpactedJobIds = Array.from(new Set(suggested.flatMap((c) => c.impactedJobIds)));
  const allImpactedEmployeeIds = Array.from(
    new Set(suggested.flatMap((c) => c.impactedEmployeeIds)),
  );

  const [{ data: companyJobs }, { data: companyEmployees }] = await Promise.all([
    allImpactedJobIds.length > 0
      ? supabase
          .from('jobs')
          .select('id, locked')
          .eq('company_id', body.company_id)
          .in('id', allImpactedJobIds)
      : Promise.resolve({ data: [] as Array<{ id: string; locked: boolean }> }),
    allImpactedEmployeeIds.length > 0
      ? supabase
          .from('employees')
          .select('id')
          .eq('company_id', body.company_id)
          .in('id', allImpactedEmployeeIds)
      : Promise.resolve({ data: [] as Array<{ id: string }> }),
  ]);

  const conflictContext = {
    lockedJobIds: new Set((companyJobs ?? []).filter((j) => j.locked).map((j) => j.id)),
    companyJobIds: new Set((companyJobs ?? []).map((j) => j.id)),
    companyEmployeeIds: new Set((companyEmployees ?? []).map((e) => e.id)),
  };

  let proposalsCreated = 0;

  for (const candidate of suggested) {
    const conflictResult = detectConflicts(candidate, conflictContext);
    if (!conflictResult.valid) {
      log('info', 'agent-orchestrator: kandidaat verworpen door Conflict Detector', {
        agent: candidate.agent,
        reason: conflictResult.reason,
      });
      continue;
    }

    const explanationResult = validateExplanation(candidate);
    if (!explanationResult.valid) {
      log('error', 'agent-orchestrator: kandidaat verworpen door Explanation Generator', {
        agent: candidate.agent,
        missingFields: explanationResult.missingFields,
      });
      continue;
    }

    const approval = decideApproval({
      actionType: candidate.payload?.type ?? null,
      automationLevel: 'proposal', // Sprint 7-scope: geen automatiseringsniveau-instellingen-UI (15_AIPlanner.md §8)
      confidence: candidate.confidence,
    });

    const { error: insertError } = await supabase.from('agent_proposals').insert({
      company_id: body.company_id,
      agent_run_id: agentRuns[candidate.agent]?.id,
      agent: candidate.agent,
      scheduled_date: candidate.scheduledDate,
      title: candidate.title,
      summary: candidate.summary,
      reasoning: candidate.reasoning,
      data_sources: candidate.dataSources,
      business_rules: candidate.businessRules,
      confidence: candidate.confidence,
      impact: candidate.impact,
      expected_gain: candidate.expectedGain,
      alternatives: candidate.alternatives,
      severity: candidate.severity,
      impacted_job_ids: candidate.impactedJobIds,
      impacted_employee_ids: candidate.impactedEmployeeIds,
      payload: candidate.payload ?? null,
      approval_status: approval.outcome === 'auto_execute' ? 'auto_executed' : 'proposed',
    });

    if (insertError) {
      log('error', 'agent-orchestrator: kon voorstel niet opslaan', {
        agent: candidate.agent,
        code: insertError.code,
      });
      continue;
    }
    proposalsCreated += 1;
  }

  log('info', 'agent-orchestrator: cyclus voltooid', {
    companyId: body.company_id,
    candidatesGenerated: suggested.length,
    proposalsCreated,
  });

  return new Response(JSON.stringify({ proposals_created: proposalsCreated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
