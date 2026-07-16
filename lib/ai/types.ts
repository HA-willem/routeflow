/**
 * Command Bar intent-routing — types & provider-contract (ADR-014, ADR-007).
 * Zuivere types zonder I/O, dual-importeerbaar door Next.js en (toekomstige)
 * Deno-aanroepen, analoog aan lib/weather/types.ts.
 *
 * Bewust smal: het model kiest uitsluitend uit een gesloten, vooraf
 * meegegeven commandolijst (ADR-014 "het taalmodel routeert, het beslist
 * niet") — geen vrije-tekst-respons, geen open-eindige acties.
 */

export interface IntentCommand {
  id: string;
  label: string;
}

/** Tokengebruik van één aanroep — voor kostenlogging (ai_usage_events, 032_ai_usage_tracking.sql). */
export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface IntentRouteResult {
  /** `null` = geen commando past goed genoeg — aanroeper toont fallback-UI. */
  commandId: string | null;
  usage: AiUsage;
}

export interface IntentRouterProvider {
  routeIntent(params: { text: string; commands: IntentCommand[] }): Promise<IntentRouteResult>;
}
