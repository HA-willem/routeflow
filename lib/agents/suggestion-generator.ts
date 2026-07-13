import type { AgentName, PipelineCandidate, RawCandidate } from './types.ts';

/**
 * Suggestion Generator (ADR-012 §2) — verpakt een gevalideerde kandidaat
 * (ná de Conflict Detector) tot het diff-voorstel-formaat (ADR-010) door
 * agent/datum toe te voegen. Triviaal in Sprint 7 (geen agent produceert nog
 * een ruwere shape die hier vertaald moet worden), maar als eigen,
 * benoemde stap aangehouden conform ADR-012 §2 — een latere agent die wél een
 * ruwere kandidaat-shape oplevert (bv. Replanning Agent's multi-job-diff)
 * breidt deze functie uit zonder de pipeline-volgorde te wijzigen.
 */
export function generateSuggestion(
  candidate: RawCandidate,
  agent: AgentName,
  scheduledDate: string,
): PipelineCandidate {
  return { ...candidate, agent, scheduledDate };
}
