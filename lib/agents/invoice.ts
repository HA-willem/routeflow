import type { BusinessRuleRef, RawCandidate } from './types.ts';

/**
 * Invoice Agent — domeinlogica (43_AI_Agents.md § 8, Sprint 7-vervolg).
 *
 * Belangrijke correctie t.o.v. de oorspronkelijke architectuurbeschrijving:
 * het aanmaken van de conceptfactuur zelf gebeurt al automatisch, synchroon,
 * in `complete_job()` (020_job_completion.sql) op het moment dat een
 * medewerker een beurt afrondt — inclusief prijsresolutie (per_job/hourly/
 * dienst-fallback) en BTW-berekening. Er is dus geen aparte "conceptfactuur
 * aanmaken"-stap meer nodig; die is al Sprint 5-scope.
 *
 * Wat deze agent toevoegt: **zichtbaarheid**. Conceptfacturen die al bestaan
 * maar nog niet verstuurd zijn (`status = 'draft'`) verdienen een actieve
 * plek op de Morning Briefing zodat ze niet onopgemerkt blijven liggen —
 * zelfde rol als Capacity Agent (persistente waarschuwing totdat de mens
 * hem oplost, geen eenmalige melding). Versturen zelf blijft altijd een
 * losse, menselijke actie (BR-702) — geen `payload`, dus geen
 * goedkeuringsstap: dit is puur signalering.
 *
 * Zuiver (geen I/O, 41_CodingStandards.md § 12): de aanroeper
 * (agent-invoice Edge Function) heeft de openstaande conceptfacturen al
 * opgehaald.
 */

export interface DraftInvoiceSummary {
  /** ISO-datum (invoices.invoice_date) — voor het bepalen hoe lang een concept al open staat. */
  invoiceDate: string;
  totalAmountCents: number;
}

export interface InvoiceAnalysisParams {
  drafts: DraftInvoiceSummary[];
  /** ISO-datum "vandaag" — puur meegegeven i.p.v. intern `new Date()` (testbaarheid, 41_CodingStandards.md § 12). */
  today: string;
}

const BUSINESS_RULES: BusinessRuleRef[] = [
  { code: 'BR-302', label: 'Concept naar definitief blijft een expliciete menselijke stap' },
];

/** Vanaf hoeveel dagen een openstaand concept als "urgent" telt i.p.v. "attention". */
const STALE_DAYS_THRESHOLD = 3;

function toUtcMillis(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcMillis(toIso) - toUtcMillis(fromIso)) / (24 * 60 * 60 * 1000));
}

export function summarizeDraftInvoices(params: InvoiceAnalysisParams): RawCandidate | null {
  const { drafts, today } = params;

  if (drafts.length === 0) {
    return null;
  }

  const totalCents = drafts.reduce((sum, d) => sum + d.totalAmountCents, 0);
  const oldestAgeDays = Math.max(...drafts.map((d) => daysBetween(d.invoiceDate, today)));
  const severity = oldestAgeDays >= STALE_DAYS_THRESHOLD ? 'urgent' : 'attention';
  const totalEuros = (totalCents / 100).toFixed(2);

  return {
    title: `${drafts.length} conceptfactu${drafts.length === 1 ? 'ur' : 'ren'} klaar om te versturen`,
    summary: `${drafts.length} conceptfactu${drafts.length === 1 ? 'ur staat' : 'ren staan'} nog als concept, samen €${totalEuros}${oldestAgeDays >= STALE_DAYS_THRESHOLD ? ` — de oudste staat al ${oldestAgeDays} dagen open` : ''}.`,
    reasoning:
      'Conceptfacturen worden automatisch aangemaakt zodra een beurt wordt afgerond (complete_job()). Deze agent signaleert uitsluitend welke concepten nog wachten op verzending — geen enkele factuur wordt door AI verstuurd (BR-702).',
    dataSources: ['Conceptfacturen (status: draft)'],
    businessRules: BUSINESS_RULES,
    confidence: 0.95,
    impact: `${drafts.length} conceptfactu${drafts.length === 1 ? 'ur' : 'ren'}, €${totalEuros}`,
    expectedGain:
      'Voorkomt dat conceptfacturen onopgemerkt blijven liggen — sneller factureren, sneller betaald.',
    alternatives:
      'Geen alternatief overwogen — dit is een zichtbaarheidssignaal, geen keuze tussen opties.',
    severity,
    impactedJobIds: [],
    impactedEmployeeIds: [],
    payload: null,
  };
}
