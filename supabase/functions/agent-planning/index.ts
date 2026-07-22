// agent-planning — Planning Agent (43_AI_Agents.md § 4, ADR-012 § 1).
//
// Formaliseert de al-bestaande planning-generate-Edge-Function (Sprint 3) tot
// agent: roept planning-generate aan met de service-rol + company_id (geen
// dry_run nodig — het aanmaken van `voorgesteld`-beurten is zelf al de door
// ADR-011 § 4 toegestane autonome actie: "Voorstellen maken" mag zonder
// per-actie-goedkeuring), en vertaalt het resultaat naar één informatieve
// kandidaat via lib/agents/planning.ts (geen `payload`, dus geen aparte
// goedkeuringsstap — de beurten bestaan al ten tijde van deze kandidaat,
// zelfde rol als Capacity/Weather Agent).
//
// Uitsluitend aanroepbaar met de service-rol (zelfde motivatie als
// agent-capacity/agent-optimization). planning-generate zelf blijft voor het
// reguliere, gebruikersgeïnitieerde pad (na dienstafspraak aanmaken/hervatten,
// FR-004/FR-005) volledig ongewijzigd.

import { summarizePlanningRun } from '../../../lib/agents/planning.ts';

import type { RawCandidate } from '../../../lib/agents/types.ts';

interface RequestBody {
  company_id: string;
  from_date: string;
  weeks: number;
}

interface PlanningGenerateResponse {
  generated_jobs: Array<{ service_agreement_id: string; dates: string[]; clustered: boolean }>;
  skipped_agreements: Array<{ service_agreement_id: string; reason: string }>;
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
  if (typeof body.from_date !== 'string' || !DATE_ONLY.test(body.from_date)) return null;
  if (
    typeof body.weeks !== 'number' ||
    !Number.isInteger(body.weeks) ||
    body.weeks < 1 ||
    body.weeks > 52
  ) {
    return null;
  }
  return { company_id: body.company_id, from_date: body.from_date, weeks: body.weeks };
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
      'company_id (uuid), from_date (YYYY-MM-DD) en weeks (1-52) zijn verplicht.',
      400,
    );
  }

  const serviceRoleAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  const functionsBaseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;

  const response = await fetch(`${functionsBaseUrl}/planning-generate`, {
    method: 'POST',
    headers: { Authorization: serviceRoleAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: body.company_id,
      from_date: body.from_date,
      weeks: body.weeks,
    }),
  }).catch((err: unknown) => {
    log('error', 'agent-planning: planning-generate onbereikbaar', {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!response || !response.ok) {
    log('error', 'agent-planning: planning-generate gaf een foutstatus', {
      status: response?.status,
    });
    return errorResponse('internal_error', 'planning-generate mislukt of onbereikbaar.', 502);
  }

  const result = (await response.json()) as PlanningGenerateResponse;

  const candidate: RawCandidate | null = summarizePlanningRun({
    fromDate: body.from_date,
    weeks: body.weeks,
    agreementResults: result.generated_jobs.map((g) => ({
      serviceAgreementId: g.service_agreement_id,
      datesGenerated: g.dates.length,
      clustered: g.clustered,
    })),
    skippedCount: result.skipped_agreements.length,
  });

  return new Response(JSON.stringify({ candidates: candidate ? [candidate] : [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
