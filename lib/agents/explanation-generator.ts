import type { ExplanationValidationResult, PipelineCandidate } from './types.ts';

/**
 * Explanation Generator (ADR-012 §2/§6, BR-703) — valideert dat een kandidaat
 * het volledige explainability-schema draagt vóórdat hij de Approval Handler
 * bereikt. Sprint 7 heeft geen taalmodel-verrijking (ADR-012 §4:
 * "kernvoorstellen zijn nooit taalmodel-afhankelijk geweest") — elke
 * domeinagent vult reasoning/dataSources/businessRules/impact/expectedGain/
 * alternatives al deterministisch in; deze stap is daarom een schema-poort,
 * geen generatie: "elke agent-output wordt tegen een schema gevalideerd...
 * een kandidaat die niet aan het schema voldoet wordt verworpen, nooit
 * doorgezet in een 'best effort'-vorm" (ADR-012 §4).
 */
export function validateExplanation(candidate: PipelineCandidate): ExplanationValidationResult {
  const missingFields: string[] = [];

  if (candidate.title.trim() === '') missingFields.push('title');
  if (candidate.summary.trim() === '') missingFields.push('summary');
  if (candidate.reasoning.trim() === '') missingFields.push('reasoning');
  if (candidate.dataSources.length === 0) missingFields.push('dataSources');
  if (candidate.businessRules.length === 0) missingFields.push('businessRules');
  if (candidate.impact.trim() === '') missingFields.push('impact');
  if (candidate.expectedGain.trim() === '') missingFields.push('expectedGain');
  if (candidate.alternatives.trim() === '') missingFields.push('alternatives');

  return { valid: missingFields.length === 0, missingFields };
}
