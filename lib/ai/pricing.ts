/**
 * Prijzen per Anthropic-model (EUR-onafhankelijk, USD/1M tokens) — losstaand van
 * ai_usage_events (032_ai_usage_tracking.sql) zodat een tabel met ruwe
 * tokencounts nooit hoeft te worden teruggerekend bij een prijswijziging.
 * Bron: console.anthropic.com/settings/billing, laatst gecontroleerd 2026-07-16.
 */
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
};

/** Onbekend model (bv. prijswijziging/nieuw modelnaam) → 0 i.p.v. gokken; dashboard toont dit apart. */
export function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) return 0;

  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
