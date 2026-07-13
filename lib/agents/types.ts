/**
 * AI Execution Pipeline — gedeelde types (ADR-012 §2/§3/§6). Zuivere types
 * zonder I/O zodat ze zowel door de Next.js-app als door Deno Edge Functions
 * geïmporteerd kunnen worden (41_CodingStandards.md § 12), analoog aan
 * lib/routing/types.ts.
 *
 * `RawCandidate` is wat een domeinagent (capacity.ts, agent-weather,
 * agent-optimization) oplevert, vóórdat hij de gedeelde pipeline-stadia
 * doorloopt (conflict-detector → suggestion-generator → explanation-generator
 * → approval-handler). De velden zijn bewust identiek aan
 * `lib/briefing/types.ts::AgentProposal` — de frontend (deze sessie gebouwd)
 * en de agent-pipeline (dit sprint) spreken dezelfde taal, geen aparte
 * mapping-laag nodig.
 */

export type AgentName =
  | 'planning'
  | 'replanning'
  | 'weather'
  | 'communication'
  | 'invoice'
  | 'capacity'
  | 'revenue'
  | 'optimization';

export type ProposalSeverity = 'info' | 'attention' | 'urgent';

export interface BusinessRuleRef {
  code: string;
  label: string;
}

/**
 * Wat de Approval Handler bij goedkeuring uitvoert — altijd via een
 * bestaande, ongewijzigde Edge Function (ADR-011 §7: "geen agent krijgt een
 * eigen, parallelle integratie"). Sprint 7 kent één actie-type; toekomstige
 * agents (Replanning, Invoice) breiden deze union uit, niet vervangen.
 */
export type ActionablePayload = { type: 'route_optimize'; employeeId: string; date: string };

/** Kandidaat-wijziging vóór de gedeelde pipeline (ADR-012 §2). */
export interface RawCandidate {
  title: string;
  summary: string;
  reasoning: string;
  dataSources: string[];
  businessRules: BusinessRuleRef[];
  /** 0..1 (ADR-012 §3) — UI toont dit als 0-100. */
  confidence: number;
  impact: string;
  expectedGain: string;
  alternatives: string;
  severity: ProposalSeverity;
  impactedJobIds: string[];
  impactedEmployeeIds: string[];
  /** null/undefined = informatief (Capacity/Weather-signalering, ADR-011 §12). */
  payload?: ActionablePayload | null;
}

/** Kandidaat ná Suggestion Generator (agent/datum toegevoegd). */
export interface PipelineCandidate extends RawCandidate {
  agent: AgentName;
  scheduledDate: string;
}

export interface ConflictCheckResult {
  valid: boolean;
  violatedRule?: BusinessRuleRef;
  reason?: string;
}

export interface ExplanationValidationResult {
  valid: boolean;
  missingFields: string[];
}

export type AutomationLevel = 'proposal' | 'semi_automatic' | 'fully_automatic';

export interface ApprovalDecision {
  outcome: 'requires_approval' | 'auto_execute';
  reason: string;
}
