// agent-invoice — Invoice Agent (43_AI_Agents.md § 8, ADR-012 § 1).
//
// Belangrijke correctie t.o.v. de oorspronkelijke architectuurbeschrijving:
// het aanmaken van de conceptfactuur zelf gebeurt al automatisch in
// complete_job() (020_job_completion.sql, Sprint 5) op het moment dat een
// beurt wordt afgerond. Deze agent voegt geen nieuwe aanmaaklogica toe —
// hij signaleert uitsluitend welke conceptfacturen (status 'draft') nog
// wachten op verzending, zodat ze niet onopgemerkt blijven liggen. Versturen
// blijft altijd een losse, menselijke actie (BR-702) — deze agent heeft dan
// ook geen schrijftoegang tot `invoices` nodig, uitsluitend SELECT.
//
// Uitsluitend aanroepbaar met de service-rol (zelfde motivatie als
// agent-capacity/agent-planning).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { summarizeDraftInvoices } from '../../../lib/agents/invoice.ts';

import type { RawCandidate } from '../../../lib/agents/types.ts';

interface RequestBody {
  company_id: string;
  today: string;
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
  if (typeof body.today !== 'string' || !DATE_ONLY.test(body.today)) return null;
  return { company_id: body.company_id, today: body.today };
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
      'company_id (uuid) en today (YYYY-MM-DD) zijn verplicht.',
      400,
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: drafts, error } = await supabase
    .from('invoices')
    .select('invoice_date, total_amount_cents')
    .eq('company_id', body.company_id)
    .eq('status', 'draft');

  if (error) {
    log('error', 'agent-invoice: kon conceptfacturen niet ophalen', { code: error.code });
    return errorResponse('internal_error', 'Kon conceptfacturen niet ophalen.', 500);
  }

  const candidate: RawCandidate | null = summarizeDraftInvoices({
    drafts: (drafts ?? []).map((d) => ({
      invoiceDate: d.invoice_date,
      totalAmountCents: d.total_amount_cents,
    })),
    today: body.today,
  });

  return new Response(JSON.stringify({ candidates: candidate ? [candidate] : [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
